import { BrokerService } from '@app/broker';
import { Injectable, Logger } from '@nestjs/common';
import { IProductValidateResult } from '../interfaces/order-item.interface';
import { EntityManager } from 'typeorm';

@Injectable()
export class OrderBrokerService {
  private readonly logger = new Logger(OrderBrokerService.name);
  constructor(private readonly broker: BrokerService) {}

  async eventOrderConfirmed(
    orderId: string,
    userId: string,
    total: number,
    items: IProductValidateResult[],
  ): Promise<void> {
    const topic = 'order.confirmed';
    this.logger.log(`publish event ${topic} with orderId: ${orderId}`);

    await this.broker.publish({
      topic,
      payload: { orderId, userId, total, items },
    });
  }

  async eventOrderCancel(
    orderId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const topic = 'order.cancelled';
    this.logger.log(`publish event ${topic} with orderId: ${orderId}`);

    await this.broker.publish({
      topic,
      payload: { orderId, userId },
    });
  }
}
