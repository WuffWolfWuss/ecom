import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Inventory } from '../entities/inventory.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class InventoryRepository {
  constructor(
    @InjectRepository(Inventory)
    private readonly repo: Repository<Inventory>,
    private readonly dataSource: DataSource,
  ) {}

  async findByProductId(productId: string): Promise<Inventory | null> {
    return this.repo.findOne({ where: { productId } });
  }

  async findByProductIds(productIds: string[]): Promise<Inventory[]> {
    return this.repo.find({
      where: productIds.map((id) => ({ productId: id })),
    });
  }

  async create(productId: string, stock = 0): Promise<Inventory> {
    return this.repo.save(this.repo.create({ productId, stock }));
  }

  async addStock(
    productId: string,
    quantity: number,
  ): Promise<Inventory | null> {
    await this.repo.increment({ productId }, 'stock', quantity);
    return this.findByProductId(productId);
  }

  // Reserve stock cho một order — dùng transaction để tránh race condition
  async reserve(items: { productId: string; qty: number }[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
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
    });
  }

  // Confirm reserve → trừ stock thật sau khi payment thành công
  async confirmReservation(
    items: { productId: string; qty: number }[],
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (const item of items) {
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
    });
  }

  // Release reserve → hoàn lại khi order fail/cancel
  async release(items: { productId: string; qty: number }[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (const item of items) {
        await manager.decrement(
          Inventory,
          { productId: item.productId },
          'reserved',
          item.qty,
        );
      }
    });
  }
}
