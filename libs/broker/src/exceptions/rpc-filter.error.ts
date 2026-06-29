import { HttpException, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

export interface NatsRpcErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
}

export function normalizeRpcError(
  exception: unknown,
  logger?: Logger,
): NatsRpcErrorResponse {
  // Case 1: HttpException (BadRequestException, NotFoundException...)
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    return {
      success: false,
      error: {
        message:
          typeof response === 'string'
            ? response
            : ((response as any).message ?? exception.message),
        code: exception.constructor.name, // 'BadRequestException', 'NotFoundException'...
        details: typeof response === 'object' ? response : undefined,
      },
    };
  }

  // Case 2: RpcException
  if (exception instanceof RpcException) {
    const err = exception.getError();
    return {
      success: false,
      error: {
        message: typeof err === 'string' ? err : (err as any).message,
        code: 'RpcException',
        details: typeof err === 'object' ? err : undefined,
      },
    };
  }

  // Case 3: Unknown (bug, lỗi DB raw, TypeError...)
  logger?.error(
    `Unhandled error in handler: ${(exception as Error)?.message}`,
    (exception as Error)?.stack,
  );
  return {
    success: false,
    error: {
      message: 'Internal error',
      code: 'INTERNAL_ERROR',
    },
  };
}
