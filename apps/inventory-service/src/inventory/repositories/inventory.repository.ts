import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Inventory } from '../entities/inventory.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from '../entities/reservation.entity';
import { ReservationStatus } from '../interfaces/inventory';

@Injectable()
export class InventoryRepository {
  private readonly logger = new Logger(InventoryRepository.name);
  constructor(
    @InjectRepository(Inventory)
    private readonly repo: Repository<Inventory>,
    private readonly dataSource: DataSource,
  ) {}

  async findByProductId(productId: string): Promise<Inventory> {
    const result = await this.repo.findOne({ where: { productId } });
    if (!result) {
      throw new NotFoundException('item not found');
    }
    return result;
  }

  async findByProductIds(productIds?: string[]): Promise<Inventory[]> {
    if (!productIds?.length)
      throw new BadRequestException(`Invalid query request.`);
    return this.repo.find({
      where: productIds.map((id) => ({ productId: id })),
    });
  }

  async create(productId: string, stock = 0): Promise<Inventory> {
    return this.repo.save(this.repo.create({ productId, stock }));
  }

  async addStock(productId: string, quantity: number): Promise<Inventory> {
    await this.repo.increment({ productId }, 'stock', quantity);
    return this.findByProductId(productId);
  }

  // Reserve stock cho một order — dùng transaction để tránh race condition
  async reserve(
    orderId: string,
    items: { productId: string; qty: number }[],
  ): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(Reservation, {
        where: { orderId },
      });
      if (existing) return existing.id;

      for (const item of items) {
        // Pessimistic lock — lock row trước khi đọc
        const inv = await manager.findOne(Inventory, {
          where: { productId: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!inv)
          throw new NotFoundException(`Product ${item.productId} not found`);
        if (inv.available < item.qty)
          throw new BadRequestException(
            `Insufficient stock for ${item.productId}`,
          );

        await manager.increment(
          Inventory,
          { productId: item.productId },
          'reserved',
          item.qty,
        );
      }
      const reservation = manager.create(Reservation, {
        orderId,
        items,
        status: ReservationStatus.RESERVED,
      });
      await manager.save(reservation);

      return reservation.id;
    });
  }

  // Confirm reserve → trừ stock thật sau khi payment thành công
  async confirmReservation(
    orderId: string,
  ): Promise<{ productId: string; qty: number }[] | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) {
        this.logger.error(
          `confirmReservation: no reservation found for order ${orderId}`,
        );
        return;
      }

      if (reservation.status !== ReservationStatus.RESERVED) return;

      for (const item of reservation.items) {
        await manager.decrement(
          Inventory,
          { productId: item.productId },
          'stock',
          item.qty,
        );
        await manager.decrement(
          Inventory,
          { productId: item.productId },
          'reserved',
          item.qty,
        );
      }

      reservation.status = ReservationStatus.CONFIRMED;
      await manager.save(reservation);

      return reservation.items;
    });
  }

  // Release reserve → hoàn lại khi order fail/cancel
  async release(
    reservationId: string,
  ): Promise<{ productId: string; qty: number }[] | undefined> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id: reservationId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!reservation) {
        this.logger.warn(
          `confirmReservation: no reservation found for reservationId ${reservationId}`,
        );
        return;
      }

      for (const item of reservation.items) {
        await manager.decrement(
          Inventory,
          { productId: item.productId },
          'reserved',
          item.qty,
        );
      }

      return reservation.items;
    });
  }
}
