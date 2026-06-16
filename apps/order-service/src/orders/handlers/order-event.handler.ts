import { BrokerService, BrokerEvent, BrokerMessage } from '@app/broker';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EOrderStatus } from '../enums/order-status.enum';
import { OrdersRepository } from '../repositories/orders.repository';

@Injectable()
export class OrderEventHandler implements OnModuleInit {
  constructor(
    private readonly broker: BrokerService,
    private readonly repo: OrdersRepository,
  ) {}

  async onModuleInit() {
    await this.broker.subscribe([this]);
  }

  // Payment service publish sau khi refund thành công
  @BrokerEvent('payment.refunded')
  async onPaymentRefunded(payload: { orderId: string }) {
    await this.repo.updateStatus(payload.orderId, EOrderStatus.CANCELLED);
  }

  @BrokerMessage('order.getItems')
  async onGetItems(data: { orderId: string }) {
    const order = await this.repo.findById(data.orderId);
    if (!order) throw new Error(`Order ${data.orderId} not found`);
    return {
      orderId: order.id,
      items: order.items.map((i) => ({ productId: i.productId, qty: i.qty })),
    };
  }
}
