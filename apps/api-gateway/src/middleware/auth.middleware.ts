/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      // GET request — cho qua, service tự quyết định qua @Public()
      if (req.method === 'GET') return next();
      throw new UnauthorizedException('Missing token');
    }

    try {
      const token = authHeader.split(' ')[1];
      const payload = this.jwtService.verify(token);
      console.log('Verify Payload: ', payload);

      // Forward userId xuống service qua header
      req.headers['x-user-id'] = payload.sub;
      req.headers['x-user-role'] = payload.role;
      next();
    } catch (error: any) {
      console.log('JWT Error: ', JSON.stringify(error));
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
