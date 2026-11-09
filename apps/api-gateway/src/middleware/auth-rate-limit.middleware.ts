import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';
import { AuthException } from '@app/common';
import { AUTH_REDIS_KEYS as K, EAuthErrorCode } from '@app/contracts';
import { AUTH_REDIS_CLIENT } from '@app/redis';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 30;

/**
 * Coarse per-IP limit on /auth/* (fixed 60 s window). Login has its own,
 * stricter per-email/per-IP failure limits in user-service.
 */
@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthRateLimitMiddleware.name);

  constructor(@Inject(AUTH_REDIS_CLIENT) private readonly redis: Redis) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip ?? 'unknown';
    const window = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
    const key = K.gatewayAuthRate(ip, window);

    let count: number;
    try {
      const result = await this.redis
        .multi()
        .incr(key)
        .expire(key, WINDOW_SECONDS, 'NX')
        .exec();
      count = Number(result?.[0]?.[1] ?? 0);
    } catch (err) {
      this.logger.error(`Auth store error: ${(err as Error).message}`);
      throw new AuthException(
        HttpStatus.SERVICE_UNAVAILABLE,
        EAuthErrorCode.AUTH_UNAVAILABLE,
        'Authentication is temporarily unavailable',
      );
    }

    if (count > MAX_REQUESTS) {
      const retryAfter =
        WINDOW_SECONDS - (Math.floor(Date.now() / 1000) % WINDOW_SECONDS);
      res.setHeader('Retry-After', retryAfter);
      throw new AuthException(
        HttpStatus.TOO_MANY_REQUESTS,
        EAuthErrorCode.RATE_LIMITED,
        'Too many requests. Try again later.',
        { retryAfter },
      );
    }
    next();
  }
}
