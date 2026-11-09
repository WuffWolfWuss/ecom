import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';
import { AuthException } from '@app/common';
import {
  AUTH_REDIS_KEYS as K,
  EAuthErrorCode,
  IAccessTokenClaims,
  INTERNAL_AUTH_HEADER,
  USER_CONTEXT_HEADERS,
} from '@app/contracts';
import { AUTH_REDIS_CLIENT } from '@app/redis';

/**
 * Runs on every proxied route.
 * - Strips client-supplied identity headers.
 * - No Authorization header → anonymous; the service decides (@Public()).
 * - Authorization header present → it must be a valid, unrevoked access token,
 *   otherwise 401 with a `code` telling the client what to do.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(
    private readonly jwt: JwtService,
    @Inject(AUTH_REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    for (const h of [
      ...Object.values(USER_CONTEXT_HEADERS),
      INTERNAL_AUTH_HEADER,
    ]) {
      delete req.headers[h];
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return next();
    if (!authHeader.startsWith('Bearer ')) {
      throw this.unauthorized(
        EAuthErrorCode.TOKEN_INVALID,
        'Malformed Authorization header',
      );
    }

    const claims = this.verify(authHeader.slice(7));

    let version: string | null;
    let session: string | null;
    try {
      [version, session] = await this.redis.mget(
        K.tokenVersion(claims.sub),
        K.session(claims.sid),
      );
    } catch (err) {
      this.logger.error(`Auth store error: ${(err as Error).message}`);
      throw new AuthException(
        HttpStatus.SERVICE_UNAVAILABLE,
        EAuthErrorCode.AUTH_UNAVAILABLE,
        'Authentication is temporarily unavailable',
      );
    }

    // Redis lost the version (flush/restart): /auth/refresh restores it from the DB.
    if (version === null) {
      throw this.unauthorized(
        EAuthErrorCode.TOKEN_EXPIRED,
        'Access token must be refreshed',
      );
    }
    if (Number(version) !== claims.ver) {
      throw this.unauthorized(
        EAuthErrorCode.TOKEN_REVOKED,
        'Access was revoked; log in again',
      );
    }
    if (session === null) {
      throw this.unauthorized(
        EAuthErrorCode.SESSION_ENDED,
        'Session has ended; log in again',
      );
    }

    req.headers[USER_CONTEXT_HEADERS.ID] = claims.sub;
    req.headers[USER_CONTEXT_HEADERS.ROLE] = claims.role;
    req.headers[USER_CONTEXT_HEADERS.SESSION_ID] = claims.sid;
    next();
  }

  private verify(token: string): IAccessTokenClaims {
    let claims: IAccessTokenClaims;
    try {
      claims = this.jwt.verify<IAccessTokenClaims>(token);
    } catch (err) {
      if ((err as Error).name === 'TokenExpiredError') {
        throw this.unauthorized(
          EAuthErrorCode.TOKEN_EXPIRED,
          'Access token expired',
        );
      }
      throw this.unauthorized(
        EAuthErrorCode.TOKEN_INVALID,
        'Invalid access token',
      );
    }
    // Old-format tokens (before sessions) have no sid/ver/typ.
    if (
      claims.typ !== 'access' ||
      !claims.sid ||
      typeof claims.ver !== 'number'
    ) {
      throw this.unauthorized(
        EAuthErrorCode.TOKEN_INVALID,
        'Invalid access token',
      );
    }
    return claims;
  }

  private unauthorized(code: EAuthErrorCode, message: string) {
    return new AuthException(HttpStatus.UNAUTHORIZED, code, message);
  }
}
