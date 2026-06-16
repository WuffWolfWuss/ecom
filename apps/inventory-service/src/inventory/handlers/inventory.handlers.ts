import { Injectable, OnModuleInit } from '@nestjs/common';
import { InventoryService } from '../inventory.service';
import { BrokerEvent, BrokerMessage, BrokerService } from '@app/broker';

@Injectable()
export class InventoryEventHandler implements OnModuleInit {
  constructor(
    private readonly broker: BrokerService,
    private readonly inventoryService: InventoryService,
  ) {}

  async onModuleInit() {
    await this.broker.subscribe([this]);
  }

  // Kafka — Product service publish khi tạo sản phẩm mới
  // Tự động tạo inventory record với stock = 0
  @BrokerEvent('product.created')
  async onProductCreated(payload: { productId: string; name: string }) {
    await this.inventoryService.addStock(payload.productId, 0);
    console.log(`Inventory record created for product: ${payload.name}`);
  }

  // NATS — Order saga gọi để reserve stock khi checkout
  @BrokerMessage('inventory.reserve')
  async onReserve(data: {
    orderId: string;
    items: { productId: string; qty: number }[];
  }) {
    return this.inventoryService.reserve(data.orderId, data.items);
  }

  // NATS — Order saga gọi để release khi order fail
  @BrokerMessage('inventory.release')
  async onRelease(data: { items: { productId: string; qty: number }[] }) {
    return this.inventoryService.release(data.items);
  }

  // Kafka — Payment service publish sau khi charge thành công
  // Confirm reserve → trừ stock thật
  @BrokerEvent('payment.succeeded')
  async onPaymentSucceeded(payload: { orderId: string }) {
    console.log(`payment.succeeded received. Order Id: ${payload.orderId}`);
    await this.inventoryService.confirmReservation(payload.orderId);
  }
}
