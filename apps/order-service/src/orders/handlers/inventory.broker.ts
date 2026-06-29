import { BrokerService } from '@app/broker';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InventoryBrokerService {
  private readonly logger = new Logger(InventoryBrokerService.name);
  constructor(private readonly broker: BrokerService) {}

  async getReservationStatus<T>(orderId: string): Promise<T> {
    const topic = 'inventory.getReservationStatus';
    this.logger.log(`send ${topic} with orderId: ${orderId}`);

    const result = await this.broker.send<T>({
      topic,
      payload: { orderId },
    });
    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );

    return result;
  }

  async reservation<T>(
    orderId: string,
    validatedItems: { productId: string; qty: number }[],
  ): Promise<T> {
    const topic = 'inventory.reserve';
    this.logger.log(`send ${topic} with orderId: ${orderId}`);

    const result = await this.broker.send<T>({
      topic,
      payload: {
        orderId,
        items: validatedItems.map((i) => ({
          productId: i.productId,
          qty: i.qty,
        })),
      },
    });

    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );

    return result;
  }

  async release(reservationId: string): Promise<void> {
    const topic = 'inventory.release';
    this.logger.log(`send ${topic} with reservationId: ${reservationId}`);
    await this.broker.send({
      topic,
      payload: { reservationId },
    });
    this.logger.log(`send ${topic} with completed.`);
  }
}
