import { BrokerService, BrokerEvent } from '@app/broker';
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
}
