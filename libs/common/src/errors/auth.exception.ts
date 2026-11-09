import { HttpException, HttpStatus } from '@nestjs/common';
import { EAuthErrorCode } from '@app/contracts';

/** HTTP error with a machine-readable `code` the client can branch on. */
export class AuthException extends HttpException {
  constructor(
    status: HttpStatus,
    code: EAuthErrorCode,
    message: string,
    extra?: Record<string, unknown>,
  ) {
    super({ statusCode: status, code, message, ...extra }, status);
  }
}
