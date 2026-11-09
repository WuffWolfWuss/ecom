import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuthException } from '@app/common';
import { EAuthErrorCode, ITokenResponse } from '@app/contracts';
import { User } from '../users/entities/user.entity';
import { EUserRole } from '../users/enums/user-role.enum';
import { BCRYPT_ROUNDS, UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { IClientMeta } from './interfaces/client-meta.interface';
import { ISessionView } from './interfaces/session.interface';
import { UsersClient } from './messaging/clients/users.client';
import { LoginAttemptService } from './services/login-attempt.service';
import { SessionService } from './services/session.service';
import { TokenService } from './services/token.service';

@Injectable()
export class AuthService {
  // Compared against when the email doesn't exist, so the response time
  // doesn't reveal which emails are registered.
  private readonly dummyHash = bcrypt.hashSync(
    randomBytes(16).toString('hex'),
    BCRYPT_ROUNDS,
  );

  constructor(
    private readonly usersService: UsersService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
    private readonly attempts: LoginAttemptService,
    private readonly usersClient: UsersClient,
  ) {}

  async register(dto: RegisterDto, meta: IClientMeta): Promise<ITokenResponse> {
    const user = await this.usersService.create({
      ...dto,
      role: EUserRole.CUSTOMER,
    });
    return this.startSession(user, meta);
  }

  async login(dto: LoginDto, meta: IClientMeta): Promise<ITokenResponse> {
    await this.attempts.assertAllowed(dto.email, meta.ip);

    const user = await this.usersService.findByEmailWithPassword(dto.email);
    const match = await bcrypt.compare(
      dto.password,
      user?.password ?? this.dummyHash,
    );
    if (!user || !match) {
      await this.attempts.recordFailure(dto.email, meta.ip);
      throw new AuthException(
        HttpStatus.UNAUTHORIZED,
        EAuthErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }
    await this.attempts.recordSuccess(dto.email);

    if (!user.isActive) throw this.accountDisabled();

    const respond = await this.usersClient.notifyLogin(user.email);
    console.log('MESSAGE RECEIVED - Response: ', JSON.stringify(respond));

    return this.startSession(user, meta);
  }

  async refresh(
    refreshToken: string,
    meta: IClientMeta,
  ): Promise<ITokenResponse> {
    const { record, session } =
      await this.sessions.consumeRefreshToken(refreshToken);

    // The database decides: account still active, tokens not revoked.
    const user = await this.usersService
      .findById(record.userId)
      .catch(() => null);
    if (!user || !user.isActive) {
      await this.sessions.revokeSession(record.sid);
      throw this.accountDisabled();
    }
    if (user.tokenVersion !== record.ver) {
      await this.sessions.revokeSession(record.sid);
      throw new AuthException(
        HttpStatus.UNAUTHORIZED,
        EAuthErrorCode.TOKEN_REVOKED,
        'Access was revoked; log in again',
      );
    }

    // Restores the gateway's copy if Redis lost it.
    await this.sessions.syncTokenVersion(user.id, user.tokenVersion);
    const next = await this.sessions.issueNextRefreshToken(
      record,
      session,
      user.tokenVersion,
      meta,
    );
    return this.toTokenResponse(
      user,
      next.sid,
      next.refreshToken,
      next.refreshTtl,
    );
  }

  logout(sid: string): Promise<void> {
    return this.sessions.revokeSession(sid);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessions.revokeUserAccess(userId);
  }

  listSessions(userId: string, currentSid?: string): Promise<ISessionView[]> {
    return this.sessions.listSessions(userId, currentSid);
  }

  async revokeOwnSession(userId: string, sid: string): Promise<void> {
    const session = await this.sessions.getSession(sid);
    // Same answer whether it doesn't exist or belongs to someone else
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }
    await this.sessions.revokeSession(sid);
  }

  private async startSession(
    user: User,
    meta: IClientMeta,
  ): Promise<ITokenResponse> {
    await this.sessions.syncTokenVersion(user.id, user.tokenVersion);
    const issued = await this.sessions.createSession(user, meta);
    return this.toTokenResponse(
      user,
      issued.sid,
      issued.refreshToken,
      issued.refreshTtl,
    );
  }

  private toTokenResponse(
    user: User,
    sid: string,
    refreshToken: string,
    refreshTtl: number,
  ): ITokenResponse {
    return {
      tokenType: 'Bearer',
      accessToken: this.tokens.signAccessToken(user, sid),
      accessTokenExpiresIn: this.tokens.accessTtl,
      refreshToken,
      refreshTokenExpiresIn: refreshTtl,
    };
  }

  private accountDisabled() {
    return new AuthException(
      HttpStatus.FORBIDDEN,
      EAuthErrorCode.ACCOUNT_DISABLED,
      'Account is disabled',
    );
  }
}
