import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity';
import { BrokerModule } from '@app/broker';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: './apps/user-service/.env' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'ecom_user'),
        password: config.get('DB_PASS', 'ecom_pass'),
        database: config.get('DB_NAME', 'ecom_users'),
        entities: [User],
        synchronize: true,   // chỉ dùng trong dev, production dùng migration
      }),
    }),
    UsersModule,
    AuthModule,
    BrokerModule 
  ],
})
export class AppModule {}