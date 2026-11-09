import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthRedisModule } from '@app/redis';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersClient } from './messaging/clients/users.client';
import { LoginAttemptService } from './services/login-attempt.service';
import { SessionService } from './services/session.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [
    UsersModule,
    AuthRedisModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    LoginAttemptService,
    UsersClient,
  ],
  controllers: [AuthController],
  exports: [SessionService],
})
export class AuthModule {}
