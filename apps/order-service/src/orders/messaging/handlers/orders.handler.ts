import { BrokerService, BrokerEvent, BrokerMessage } from '@app/broker';
import { ORDER_TOPICS, PAYMENT_TOPICS } from '@app/contracts';
import type {
  IOrderItemsRequest,
  IOrderItemsResult,
  IPaymentRefundedEvent,
} from '@app/contracts';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EOrderStatus } from '../../enums/order-status.enum';
import { OrdersRepository } from '../../repositories/orders.repository';

@Injectable()
export class OrdersHandler implements OnModuleInit {
  constructor(
    private readonly broker: BrokerService,
    private readonly repo: OrdersRepository,
  ) {}

  async onModuleInit() {
    await this.broker.subscribe([this]);
  }

  // Payment service publish sau khi refund thành công
  @BrokerEvent(PAYMENT_TOPICS.REFUNDED)
  async onPaymentRefunded(payload: IPaymentRefundedEvent) {
    await this.repo.updateStatus(payload.orderId, EOrderStatus.CANCELLED);
  }

  @BrokerMessage(ORDER_TOPICS.GET_ITEMS)
  async onGetItems(data: IOrderItemsRequest): Promise<IOrderItemsResult> {
    const order = await this.repo.findById(data.orderId);
    if (!order) throw new Error(`Order ${data.orderId} not found`);
    return {
      orderId: order.id,
      items: order.items.map((i) => ({ productId: i.productId, qty: i.qty })),
    };
  }
}
