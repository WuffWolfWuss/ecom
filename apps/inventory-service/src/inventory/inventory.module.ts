import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Inventory } from './entities/inventory.entity';
import { InventoryEventHandler } from './handlers/inventory.handlers';
import { InventoryRepository } from './repositories/inventory.repository';
import { Reservation } from './entities/reservation.entity';
import { ReservationRepository } from './repositories/reservation.repository';
import { InventoryBrokerService } from './handlers/inventory.broker';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, Reservation])],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryEventHandler,
    InventoryRepository,
    ReservationRepository,
    InventoryBrokerService,
  ],
})
export class InventoryModule {}
