/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import {
  INTERNAL_AUTH_HEADER,
  IRequestUser,
  USER_CONTEXT_HEADERS,
} from '@app/contracts';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_DIRECT_ACCESS_KEY } from '../decorators/allow-direct-access.decorator';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  private readonly secret: Buffer;

  constructor(
    private readonly reflector: Reflector,
    config: ConfigService,
  ) {
    const secret = config.get<string>('INTERNAL_SECRET');
    // Fail fast at startup: without the secret, user headers can't be trusted.
    if (!secret) throw new Error('INTERNAL_SECRET is not set');
    this.secret = Buffer.from(secret);
  }

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const req = ctx.switchToHttp().getRequest();

    // 1. Request must come through the gateway (except e.g. /health)
    const allowDirect = this.reflector.getAllAndOverride<boolean>(
      ALLOW_DIRECT_ACCESS_KEY,
      targets,
    );
    if (
      !allowDirect &&
      !this.hasValidSecret(req.headers[INTERNAL_AUTH_HEADER])
    ) {
      throw new UnauthorizedException('Direct access is not allowed');
    }

    // 2. Attach the identity set by the gateway (if any)
    const userId = req.headers[USER_CONTEXT_HEADERS.ID];
    if (userId) {
      const user: IRequestUser = {
        id: userId,
        role: req.headers[USER_CONTEXT_HEADERS.ROLE],
        sid: req.headers[USER_CONTEXT_HEADERS.SESSION_ID],
      };
      req.user = user;
    }

    // 3. @Public() routes don't need a user
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );
    if (isPublic) return true;

    if (!userId) throw new UnauthorizedException('Missing user identity');
    return true;
  }

  private hasValidSecret(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const given = Buffer.from(value);
    return (
      given.length === this.secret.length && timingSafeEqual(given, this.secret)
    );
  }
}
