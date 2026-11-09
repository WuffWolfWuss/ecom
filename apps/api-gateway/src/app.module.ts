import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthRedisModule } from '@app/redis';
import { AuthMiddleware } from './middleware/auth.middleware';
import { AuthRateLimitMiddleware } from './middleware/auth-rate-limit.middleware';
import { ProxyModule } from './proxy/proxy.module';
import { ProxyController } from './proxy/proxy.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/api-gateway/.env',
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    AuthRedisModule,
    ProxyModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthRateLimitMiddleware)
      .forRoutes(
        { path: 'auth', method: RequestMethod.ALL },
        { path: 'auth/*path', method: RequestMethod.ALL },
      );
    // Every proxied route, auth/* included (logout, sessions need the user).
    consumer.apply(AuthMiddleware).forRoutes(ProxyController);
  }
}
