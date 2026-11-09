import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Redis client for auth state, on its own database (AUTH_REDIS_URL). */
export const AUTH_REDIS_CLIENT = 'AUTH_REDIS_CLIENT';

@Module({
  providers: [
    {
      provide: AUTH_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(
          config.get<string>('AUTH_REDIS_URL') ?? 'redis://localhost:6379/1',
          {
            // Fail fast instead of queueing: callers turn errors into
            // 503 AUTH_UNAVAILABLE (fail closed) rather than hanging.
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
          },
        ),
    },
  ],
  exports: [AUTH_REDIS_CLIENT],
})
export class AuthRedisModule {}
