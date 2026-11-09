import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { IAccessTokenClaims } from '@app/contracts';
import {
  DEFAULT_ACCESS_TOKEN_TTL,
  DEFAULT_REFRESH_ABSOLUTE_TTL,
  DEFAULT_REFRESH_TOKEN_TTL,
} from '../auth.constants';

@Injectable()
export class TokenService {
  readonly accessTtl: number;
  readonly refreshTtl: number;
  readonly refreshAbsoluteTtl: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessTtl = Number(
      config.get('JWT_ACCESS_TTL', DEFAULT_ACCESS_TOKEN_TTL),
    );
    this.refreshTtl = Number(
      config.get('JWT_REFRESH_TTL', DEFAULT_REFRESH_TOKEN_TTL),
    );
    this.refreshAbsoluteTtl = Number(
      config.get('JWT_REFRESH_ABSOLUTE_TTL', DEFAULT_REFRESH_ABSOLUTE_TTL),
    );
  }

  signAccessToken(
    user: {
      id: string;
      role: string;
      tokenVersion: number;
    },
    sid: string,
  ): string {
    const claims: IAccessTokenClaims = {
      sub: user.id,
      role: user.role,
      sid,
      ver: user.tokenVersion,
      typ: 'access',
      jti: randomUUID(),
    };
    return this.jwt.sign(claims, { expiresIn: this.accessTtl });
  }

  /** Opaque 256-bit token. Only its hash is stored. */
  generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hashRefreshToken(token) };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
