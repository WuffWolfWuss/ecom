/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { INTERNAL_AUTH_HEADER, USER_CONTEXT_HEADERS } from '@app/contracts';

@Injectable()
export class OptionalAuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Never trust identity headers sent by the client
    for (const h of [
      ...Object.values(USER_CONTEXT_HEADERS),
      INTERNAL_AUTH_HEADER,
    ]) {
      delete req.headers[h];
    }

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.jwtService.verify(authHeader.split(' ')[1]);
        req.headers[USER_CONTEXT_HEADERS.ID] = payload.sub;
        req.headers[USER_CONTEXT_HEADERS.ROLE] = payload.role;
      } catch {} // ignore invalid token cho public routes
    }
    next();
  }
}
