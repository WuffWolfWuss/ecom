import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Inventory } from './entities/inventory.entity';
import { InventoryEventHandler } from './handlers/inventory.handlers';
import { InventoryRepository } from './repositories/inventory.repository';
import { OrderClient } from './handlers/order.client';
import { InventoryConfirmation } from './entities/inventory.confirmation';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, InventoryConfirmation])],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryEventHandler,
    InventoryRepository,
    OrderClient,
  ],
})
export class InventoryModule {}
