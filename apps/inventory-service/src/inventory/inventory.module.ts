import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Inventory } from './entities/inventory.entity';
import { InventoryHandler } from './messaging/handlers/inventory.handler';
import { InventoryRepository } from './repositories/inventory.repository';
import { Reservation } from './entities/reservation.entity';
import { ReservationRepository } from './repositories/reservation.repository';
import { InventoryPublisher } from './messaging/publishers/inventory.publisher';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, Reservation])],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryHandler,
    InventoryRepository,
    ReservationRepository,
    InventoryPublisher,
  ],
})
export class InventoryModule {}
