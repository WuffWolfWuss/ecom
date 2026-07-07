import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthMiddleware } from './middleware/auth.middleware';
import { OptionalAuthMiddleware } from './middleware/optional-auth.middleware';
import { ProxyModule } from './proxy/proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/api-gateway/.env',
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
    ProxyModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Auth
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'users/*path', method: RequestMethod.ALL },
        { path: 'orders', method: RequestMethod.ALL },
        { path: 'orders/*path', method: RequestMethod.ALL },
        { path: 'payments', method: RequestMethod.ALL },
        { path: 'payments/*path', method: RequestMethod.ALL },
        { path: 'inventory', method: RequestMethod.ALL },
        { path: 'inventory/*path', method: RequestMethod.ALL },
        { path: 'products', method: RequestMethod.ALL },
        { path: 'products/*path', method: RequestMethod.ALL },
        { path: 'categories', method: RequestMethod.ALL },
        { path: 'categories/*path', method: RequestMethod.ALL },
      );

    // Routes public
    consumer.apply(OptionalAuthMiddleware).forRoutes();
  }
}
