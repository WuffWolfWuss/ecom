import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity';
import { BrokerModule } from '@app/broker';
import { typeOrmConfigFactory } from '@app/database';
import { HealthModule } from '@app/common/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/user-service/.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        typeOrmConfigFactory(config, [User]),
    }),
    HealthModule.forRoot({ database: 'postgres' }),
    UsersModule,
    AuthModule,
    BrokerModule,
  ],
})
export class AppModule {}
