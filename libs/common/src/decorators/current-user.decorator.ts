import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { IRequestUser } from '@app/contracts';

/**
 * `@CurrentUser()` → user id (default), `@CurrentUser('sid')` → session id,
 * `@CurrentUser('role')` → role. Set by InternalAuthGuard from gateway headers.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof IRequestUser | undefined, ctx: ExecutionContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request.user as IRequestUser | undefined;
    return user?.[field ?? 'id'];
  },
);
