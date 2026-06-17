// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from './inventory/inventory.module';
import { BrokerModule } from '@app/broker';
import { Inventory } from './inventory/entities/inventory.entity';
import { typeOrmConfigFactory } from '@app/database';
import { HealthModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/inventory-service/.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        typeOrmConfigFactory(config, [Inventory]),
    }),
    HealthModule.forRoot({ database: 'postgres' }),
    BrokerModule,
    InventoryModule,
  ],
})
export class AppModule {}
