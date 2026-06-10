// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from './inventory/inventory.module';
import { BrokerModule } from '@app/broker';
import { Inventory } from './inventory/entities/inventory.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/inventory-service/.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'ecom_user'),
        password: config.get('DB_PASS', 'ecom_pass'),
        database: config.get('DB_NAME', 'ecom_inventory'),
        entities: [Inventory],
        synchronize: true,
      }),
    }),
    BrokerModule,
    InventoryModule,
  ],
})
export class AppModule {}
