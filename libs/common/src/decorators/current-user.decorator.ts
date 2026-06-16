import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();
    // Đọc từ header do Gateway forward xuống
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return request.user?.id as string;
  },
);
