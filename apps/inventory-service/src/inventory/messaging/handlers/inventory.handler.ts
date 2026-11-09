import { Injectable, OnModuleInit } from '@nestjs/common';
import { InventoryService } from '../../inventory.service';
import { BrokerEvent, BrokerMessage, BrokerService } from '@app/broker';
import {
  INVENTORY_TOPICS,
  PAYMENT_TOPICS,
  PRODUCT_TOPICS,
} from '@app/contracts';
import type {
  IPaymentSucceededEvent,
  IProductCreatedEvent,
  IReleaseRequest,
  IReservationStatusRequest,
  IReserveRequest,
} from '@app/contracts';

@Injectable()
export class InventoryHandler implements OnModuleInit {
  constructor(
    private readonly broker: BrokerService,
    private readonly inventoryService: InventoryService,
  ) {}

  async onModuleInit() {
    await this.broker.subscribe([this]);
  }

  // Kafka — Product service publish khi tạo sản phẩm mới
  // Tự động tạo inventory record với stock = 0
  @BrokerEvent(PRODUCT_TOPICS.CREATED)
  async onProductCreated(payload: IProductCreatedEvent) {
    await this.inventoryService.addStock(payload.productId, 0);
    console.log(`Inventory record created for product: ${payload.name}`);
  }

  // NATS — Order saga gọi để reserve stock khi checkout
  @BrokerMessage(INVENTORY_TOPICS.RESERVE)
  async onReserve(data: IReserveRequest) {
    return this.inventoryService.reserve(data.orderId, data.items);
  }

  // NATS — Order saga gọi để release khi order fail
  @BrokerMessage(INVENTORY_TOPICS.RELEASE)
  async onRelease(data: IReleaseRequest) {
    return this.inventoryService.release(data.reservationId);
  }

  // NATS — Order saga gọi để check status reservate
  @BrokerMessage(INVENTORY_TOPICS.GET_RESERVATION_STATUS)
  async getReservateStatus(data: IReservationStatusRequest) {
    return this.inventoryService.getReservationStatus(data.orderId);
  }

  // Kafka — Payment service publish sau khi charge thành công
  // Confirm reserve → trừ stock thật
  @BrokerEvent(PAYMENT_TOPICS.SUCCEEDED)
  async onPaymentSucceeded(payload: IPaymentSucceededEvent) {
    console.log(`payment.succeeded received. Order Id: ${payload.orderId}`);
    await this.inventoryService.confirmReservation(payload.orderId);
  }
}
