import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrokerModule } from '@app/broker';
import { Payment } from './payments/entities/payment.entity';
import { PaymentsModule } from './payments/payments.module';
import { HealthModule } from '@app/common';
import { typeOrmConfigFactory } from '@app/database';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/payment-service/.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        typeOrmConfigFactory(config, [Payment]),
    }),
    HealthModule.forRoot({ database: 'postgres' }),
    BrokerModule,
    PaymentsModule,
  ],
})
export class AppModule {}
