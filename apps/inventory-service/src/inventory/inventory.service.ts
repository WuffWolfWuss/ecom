// inventory/inventory.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InventoryRepository } from './repositories/inventory.repository';

@Injectable()
export class InventoryService {
  constructor(private readonly repo: InventoryRepository) {}

  async getStock(productId: string) {
    const inv = await this.repo.findByProductId(productId);
    if (!inv) throw new NotFoundException('Product not in inventory');
    return {
      productId: inv.productId,
      stock: inv.stock,
      reserved: inv.reserved,
      available: inv.available,
    };
  }

  async addStock(productId: string, quantity: number) {
    let inv = await this.repo.findByProductId(productId);
    if (!inv) {
      inv = await this.repo.create(productId, quantity);
    } else {
      inv = await this.repo.addStock(productId, quantity);
    }
    return {
      productId: inv?.productId,
      stock: inv?.stock,
      available: inv?.available,
    };
  }

  async reserve(orderId: string, items: { productId: string; qty: number }[]) {
    try {
      await this.repo.reserve(items);
      return { success: true, orderId };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async confirmReservation(items: { productId: string; qty: number }[]) {
    await this.repo.confirmReservation(items);
    return { success: true };
  }

  async release(items: { productId: string; qty: number }[]) {
    await this.repo.release(items);
    return { success: true };
  }

  async checkAvailability(items: { productId: string; qty: number }[]) {
    const ids = items.map((i) => i.productId);
    const inventories = await this.repo.findByProductIds(ids);

    const result = items.map((item) => {
      const inv = inventories.find((i) => i.productId === item.productId);
      const available = inv ? inv.stock - inv.reserved : 0;
      return {
        productId: item.productId,
        requested: item.qty,
        available,
        canFulfill: available >= item.qty,
      };
    });

    return {
      allAvailable: result.every((r) => r.canFulfill),
      items: result,
    };
  }
}
