import { BrokerService } from '@app/broker';
import {
  IOrderCancelledEvent,
  IOrderConfirmedEvent,
  IProductValidateResult,
  ORDER_TOPICS,
} from '@app/contracts';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OrdersPublisher {
  private readonly logger = new Logger(OrdersPublisher.name);
  constructor(private readonly broker: BrokerService) {}

  async eventOrderConfirmed(
    orderId: string,
    userId: string,
    total: number,
    items: IProductValidateResult[],
  ): Promise<void> {
    const topic = ORDER_TOPICS.CONFIRMED;
    this.logger.log(`publish event ${topic} with orderId: ${orderId}`);

    const payload: IOrderConfirmedEvent = { orderId, userId, total, items };
    await this.broker.publish({ topic, payload });
  }

  async eventOrderCancel(orderId: string, userId: string): Promise<void> {
    const topic = ORDER_TOPICS.CANCELLED;
    this.logger.log(`publish event ${topic} with orderId: ${orderId}`);

    const payload: IOrderCancelledEvent = { orderId, userId };
    await this.broker.publish({ topic, payload });
  }
}
