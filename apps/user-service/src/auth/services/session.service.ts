import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { AuthException } from '@app/common';
import {
  AUTH_REDIS_KEYS as K,
  EAuthErrorCode,
  IRefreshTokenRecord,
  ISessionRecord,
} from '@app/contracts';
import { AUTH_REDIS_CLIENT } from '@app/redis';
import { UsersService } from '../../users/users.service';
import { IClientMeta } from '../interfaces/client-meta.interface';
import { ISessionView } from '../interfaces/session.interface';
import { TokenService } from './token.service';

// Sets the key only if it's missing or lower — the version never goes back,
// even if a slow login/refresh races with an admin revoke.
const SET_MAX_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
if (not cur) or (tonumber(cur) < tonumber(ARGV[1])) then
  redis.call('SET', KEYS[1], ARGV[1])
end
return 1`;

export interface IIssuedRefreshToken {
  sid: string;
  refreshToken: string;
  refreshTtl: number;
}

/**
 * Session + refresh-token state in the auth Redis database.
 * Every Redis failure becomes 503 AUTH_UNAVAILABLE (fail closed).
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @Inject(AUTH_REDIS_CLIENT) private readonly redis: Redis,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}

  /** Publishes the user's token version for the gateway (never lowers it). */
  syncTokenVersion(userId: string, version: number): Promise<void> {
    return this.run(async () => {
      await this.redis.eval(SET_MAX_SCRIPT, 1, K.tokenVersion(userId), version);
    });
  }

  createSession(
    user: { id: string; tokenVersion: number },
    meta: IClientMeta,
  ): Promise<IIssuedRefreshToken> {
    return this.run(async () => {
      const sid = randomUUID();
      const { token, hash } = this.tokens.generateRefreshToken();
      const now = Date.now();
      const ttl = Math.min(
        this.tokens.refreshTtl,
        this.tokens.refreshAbsoluteTtl,
      );

      const session: ISessionRecord = {
        userId: user.id,
        createdAt: new Date(now).toISOString(),
        lastUsedAt: new Date(now).toISOString(),
        absoluteExpiresAt: now + this.tokens.refreshAbsoluteTtl * 1000,
        refreshTokenHash: hash,
        ip: meta.ip,
        userAgent: meta.userAgent,
      };
      const record: IRefreshTokenRecord = {
        userId: user.id,
        sid,
        ver: user.tokenVersion,
      };

      await this.redis
        .multi()
        .set(K.session(sid), JSON.stringify(session), 'EX', ttl)
        .set(K.refreshToken(hash), JSON.stringify(record), 'EX', ttl)
        .sadd(K.userSessions(user.id), sid)
        .expire(K.userSessions(user.id), this.tokens.refreshAbsoluteTtl)
        .exec();

      return { sid, refreshToken: token, refreshTtl: ttl };
    });
  }

  /**
   * Claims a refresh token (one-time use). A token that was already rotated
   * means it leaked: the whole session is revoked.
   */
  consumeRefreshToken(
    refreshToken: string,
  ): Promise<{ record: IRefreshTokenRecord; session: ISessionRecord }> {
    return this.run(async () => {
      const hash = this.tokens.hashRefreshToken(refreshToken);
      const raw = await this.redis.getdel(K.refreshToken(hash));

      if (!raw) {
        const reusedSid = await this.redis.get(K.usedRefreshToken(hash));
        if (reusedSid) {
          this.logger.warn(
            `Refresh token reuse detected for session ${reusedSid} — revoking session`,
          );
          await this.revokeSession(reusedSid);
          throw new AuthException(
            HttpStatus.UNAUTHORIZED,
            EAuthErrorCode.REFRESH_TOKEN_REUSED,
            'Refresh token was already used. The session has been revoked; log in again.',
          );
        }
        throw new AuthException(
          HttpStatus.UNAUTHORIZED,
          EAuthErrorCode.REFRESH_TOKEN_INVALID,
          'Invalid or expired refresh token',
        );
      }

      const record = JSON.parse(raw) as IRefreshTokenRecord;
      await this.redis.set(
        K.usedRefreshToken(hash),
        record.sid,
        'EX',
        this.tokens.refreshAbsoluteTtl,
      );

      const sessionRaw = await this.redis.get(K.session(record.sid));
      if (!sessionRaw) throw this.sessionEnded();
      const session = JSON.parse(sessionRaw) as ISessionRecord;

      if (session.absoluteExpiresAt <= Date.now()) {
        await this.revokeSession(record.sid);
        throw this.sessionEnded();
      }
      return { record, session };
    });
  }

  /** Issues the next refresh token of a session (rotation). */
  issueNextRefreshToken(
    record: IRefreshTokenRecord,
    session: ISessionRecord,
    tokenVersion: number,
    meta: IClientMeta,
  ): Promise<IIssuedRefreshToken> {
    return this.run(async () => {
      const remaining = Math.floor(
        (session.absoluteExpiresAt - Date.now()) / 1000,
      );
      const ttl = Math.min(this.tokens.refreshTtl, remaining);
      if (ttl <= 0) throw this.sessionEnded();

      const { token, hash } = this.tokens.generateRefreshToken();
      const next: ISessionRecord = {
        ...session,
        lastUsedAt: new Date().toISOString(),
        refreshTokenHash: hash,
        ip: meta.ip ?? session.ip,
        userAgent: meta.userAgent ?? session.userAgent,
      };
      const nextRecord: IRefreshTokenRecord = { ...record, ver: tokenVersion };

      await this.redis
        .multi()
        .set(K.session(record.sid), JSON.stringify(next), 'EX', ttl)
        .set(K.refreshToken(hash), JSON.stringify(nextRecord), 'EX', ttl)
        .exec();

      return { sid: record.sid, refreshToken: token, refreshTtl: ttl };
    });
  }

  getSession(sid: string): Promise<ISessionRecord | null> {
    return this.run(async () => {
      const raw = await this.redis.get(K.session(sid));
      return raw ? (JSON.parse(raw) as ISessionRecord) : null;
    });
  }

  /** Ends one session: its access tokens fail at the gateway right away. */
  revokeSession(sid: string): Promise<void> {
    return this.run(async () => {
      const session = await this.getSession(sid);
      const tx = this.redis.multi().del(K.session(sid));
      if (session) {
        tx.del(K.refreshToken(session.refreshTokenHash)).srem(
          K.userSessions(session.userId),
          sid,
        );
      }
      await tx.exec();
    });
  }

  /**
   * Revokes everything the user holds: bumps tokenVersion (DB, then Redis)
   * so every access token is rejected, then deletes all sessions.
   */
  revokeUserAccess(userId: string): Promise<number> {
    return this.run(async () => {
      const version = await this.users.incrementTokenVersion(userId);
      await this.syncTokenVersion(userId, version);

      const sids = await this.redis.smembers(K.userSessions(userId));
      const sessions = sids.length
        ? await this.redis.mget(sids.map((sid) => K.session(sid)))
        : [];
      const tx = this.redis.multi().del(K.userSessions(userId));
      sids.forEach((sid, i) => {
        tx.del(K.session(sid));
        const raw = sessions[i];
        if (raw) {
          const s = JSON.parse(raw) as ISessionRecord;
          tx.del(K.refreshToken(s.refreshTokenHash));
        }
      });
      await tx.exec();

      this.logger.log(
        `Revoked all access for user ${userId} (${sids.length} sessions, tokenVersion=${version})`,
      );
      return version;
    });
  }

  listSessions(userId: string, currentSid?: string): Promise<ISessionView[]> {
    return this.run(async () => {
      const sids = await this.redis.smembers(K.userSessions(userId));
      if (!sids.length) return [];
      const raws = await this.redis.mget(sids.map((sid) => K.session(sid)));

      const views: ISessionView[] = [];
      const stale: string[] = [];
      sids.forEach((sid, i) => {
        const raw = raws[i];
        if (!raw) return stale.push(sid);
        const s = JSON.parse(raw) as ISessionRecord;
        views.push({
          sid,
          createdAt: s.createdAt,
          lastUsedAt: s.lastUsedAt,
          ip: s.ip,
          userAgent: s.userAgent,
          current: sid === currentSid,
        });
      });
      if (stale.length) await this.redis.srem(K.userSessions(userId), ...stale);
      return views.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
    });
  }

  private sessionEnded() {
    return new AuthException(
      HttpStatus.UNAUTHORIZED,
      EAuthErrorCode.SESSION_ENDED,
      'Session has ended; log in again',
    );
  }

  /** Lets HTTP errors through; turns Redis/infra errors into 503. */
  private async run<T>(op: () => Promise<T>): Promise<T> {
    try {
      return await op();
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Auth store error: ${(err as Error).message}`);
      throw new AuthException(
        HttpStatus.SERVICE_UNAVAILABLE,
        EAuthErrorCode.AUTH_UNAVAILABLE,
        'Authentication is temporarily unavailable',
      );
    }
  }
}
