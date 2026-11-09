import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OptionalAuthMiddleware } from './middleware/optional-auth.middleware';
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
        secret: config.get('JWT_SECRET'),
      }),
    }),
    ProxyModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Every proxied route, including auth/*: strips client-supplied identity
    // headers, then sets them from a valid Bearer token.
    consumer.apply(OptionalAuthMiddleware).forRoutes(ProxyController);
  }
}
