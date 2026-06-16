/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    // Nếu route có @Public() thì bỏ qua auth
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(), // check ở method trước
      ctx.getClass(), // sau đó check ở class
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();

    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('Missing user identity');

    req.user = {
      id: userId,
      role: req.headers['x-user-role'],
    };

    return true;
  }
}
