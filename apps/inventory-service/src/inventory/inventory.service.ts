import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InventoryRepository } from './repositories/inventory.repository';
import { ReservationRepository } from './repositories/reservation.repository';
import { InventoryBrokerService } from './handlers/inventory.broker';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  constructor(
    private readonly repo: InventoryRepository,
    private readonly repoReservate: ReservationRepository,
    private readonly inventoryBroker: InventoryBrokerService,
  ) {}

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
    this.inventoryBroker.stockChanged([inv]);

    return {
      productId: inv?.productId,
      stock: inv?.stock,
      available: inv?.available,
    };
  }

  async reserve(orderId: string, items: { productId: string; qty: number }[]) {
    try {
      const reservationId = await this.repo.reserve(orderId, items);
      const itemsChanged = await this.repo.findByProductIds(
        items.map((v) => v.productId),
      );
      this.inventoryBroker.stockChanged(itemsChanged);
      return { success: true, reservationId };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async confirmReservation(orderId: string) {
    this.logger.log(`confirmReservation Order Id: ${orderId}`);
    // const items = await this.orderClient.getOrderItems(orderId);
    const items = await this.repo.confirmReservation(orderId);
    const itemsChanged = await this.repo.findByProductIds(
      items?.map((v) => v.productId),
    );
    this.inventoryBroker.stockChanged(itemsChanged);
    return { success: true };
  }

  async release(reservationId: string) {
    const items = await this.repo.release(reservationId);
    const itemsChanged = await this.repo.findByProductIds(
      items?.map((v) => v.productId),
    );
    this.inventoryBroker.stockChanged(itemsChanged);
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

  async getReservationStatus(orderId: string) {
    try {
      const reservation =
        await this.repoReservate.getReservationStatus(orderId);
      return reservation;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
