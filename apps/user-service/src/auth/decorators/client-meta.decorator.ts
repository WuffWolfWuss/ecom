import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { IClientMeta } from '../interfaces/client-meta.interface';

/**
 * Client IP and user agent as forwarded by the gateway. Safe to trust here
 * because InternalAuthGuard only admits requests carrying the internal secret.
 */
export const ClientMeta = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): IClientMeta => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      ?.split(',')[0]
      .trim();
    return { ip: ip || req.ip, userAgent: req.headers['user-agent'] };
  },
);
