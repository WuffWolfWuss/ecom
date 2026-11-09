import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';
import { AuthException } from '@app/common';
import { AUTH_REDIS_KEYS as K, EAuthErrorCode } from '@app/contracts';
import { AUTH_REDIS_CLIENT } from '@app/redis';
import {
  LOGIN_FAIL_WINDOW,
  LOGIN_IP_BLOCK,
  LOGIN_LOCK_BASE,
  LOGIN_LOCK_MAX,
  LOGIN_MAX_FAILS_PER_EMAIL,
  LOGIN_MAX_FAILS_PER_IP,
} from '../auth.constants';

/**
 * Brute-force protection for login.
 * - Per email: N failures in the window → lock; each repeat lock doubles.
 * - Per IP: M failures in the window → block.
 * Locks apply to any email, registered or not, so they don't reveal accounts.
 */
@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger(LoginAttemptService.name);

  constructor(@Inject(AUTH_REDIS_CLIENT) private readonly redis: Redis) {}

  async assertAllowed(email: string, ip?: string): Promise<void> {
    const e = this.normalize(email);
    const [lockTtl, blockTtl] = await this.run(() =>
      Promise.all([
        this.redis.ttl(K.loginLockByEmail(e)),
        ip ? this.redis.ttl(K.loginBlockByIp(ip)) : Promise.resolve(-2),
      ]),
    );
    const retryAfter = Math.max(lockTtl, blockTtl);
    if (retryAfter > 0) {
      throw new AuthException(
        HttpStatus.TOO_MANY_REQUESTS,
        EAuthErrorCode.TOO_MANY_ATTEMPTS,
        'Too many failed login attempts. Try again later.',
        { retryAfter },
      );
    }
  }

  async recordFailure(email: string, ip?: string): Promise<void> {
    const e = this.normalize(email);
    await this.run(async () => {
      const tx = this.redis
        .multi()
        .incr(K.loginFailsByEmail(e))
        .expire(K.loginFailsByEmail(e), LOGIN_FAIL_WINDOW, 'NX');
      if (ip) {
        tx.incr(K.loginFailsByIp(ip)).expire(
          K.loginFailsByIp(ip),
          LOGIN_FAIL_WINDOW,
          'NX',
        );
      }
      const res = (await tx.exec()) ?? [];
      const emailFails = Number(res[0]?.[1] ?? 0);
      const ipFails = ip ? Number(res[2]?.[1] ?? 0) : 0;

      if (emailFails >= LOGIN_MAX_FAILS_PER_EMAIL) {
        const level = await this.redis.incr(K.loginLockLevel(e));
        await this.redis.expire(K.loginLockLevel(e), LOGIN_LOCK_MAX);
        const lockFor = Math.min(
          LOGIN_LOCK_BASE * 2 ** (level - 1),
          LOGIN_LOCK_MAX,
        );
        await this.redis
          .multi()
          .set(K.loginLockByEmail(e), '1', 'EX', lockFor)
          .del(K.loginFailsByEmail(e))
          .exec();
        this.logger.warn(
          `Login locked for ${e} for ${lockFor}s (level ${level})`,
        );
      }

      if (ip && ipFails >= LOGIN_MAX_FAILS_PER_IP) {
        await this.redis
          .multi()
          .set(K.loginBlockByIp(ip), '1', 'EX', LOGIN_IP_BLOCK)
          .del(K.loginFailsByIp(ip))
          .exec();
        this.logger.warn(`Login blocked for IP ${ip} for ${LOGIN_IP_BLOCK}s`);
      }
    });
  }

  async recordSuccess(email: string): Promise<void> {
    const e = this.normalize(email);
    await this.run(() =>
      this.redis.del(K.loginFailsByEmail(e), K.loginLockLevel(e)),
    );
  }

  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }

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
