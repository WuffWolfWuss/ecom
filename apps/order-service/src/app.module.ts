// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { OrderModule } from './orders/order.module';
import { BrokerModule } from '@app/broker';
import { typeOrmConfigFactory } from '@app/database';
import { HealthModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/order-service/.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        typeOrmConfigFactory(config, [Order, OrderItem]),
    }),
    HealthModule.forRoot({ database: 'postgres' }),
    OrderModule,
    BrokerModule,
  ],
})
export class AppModule {}
