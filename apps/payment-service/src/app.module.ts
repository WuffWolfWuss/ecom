// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrokerModule } from '@app/broker';
import { Payment } from './payments/entities/payment.entity';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/payment-service/.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'ecom_user'),
        password: config.get('DB_PASS', 'ecom_pass'),
        database: config.get('DB_NAME'),
        entities: [Payment],
        synchronize: true,
      }),
    }),
    BrokerModule,
    PaymentsModule,
  ],
})
export class AppModule {}
