import { BrokerService } from '@app/broker';
import {
  ILineItem,
  INVENTORY_TOPICS,
  IReleaseRequest,
  IReservationStatus,
  IReservationStatusRequest,
  IReserveRequest,
  IReserveResult,
} from '@app/contracts';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InventoryClient {
  private readonly logger = new Logger(InventoryClient.name);
  constructor(private readonly broker: BrokerService) {}

  async getReservationStatus(orderId: string): Promise<IReservationStatus> {
    const topic = INVENTORY_TOPICS.GET_RESERVATION_STATUS;
    this.logger.log(`send ${topic} with orderId: ${orderId}`);

    const payload: IReservationStatusRequest = { orderId };
    const result = await this.broker.send<IReservationStatus>({
      topic,
      payload,
    });
    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );

    return result;
  }

  async reservation(
    orderId: string,
    validatedItems: ILineItem[],
  ): Promise<IReserveResult> {
    const topic = INVENTORY_TOPICS.RESERVE;
    this.logger.log(`send ${topic} with orderId: ${orderId}`);

    const payload: IReserveRequest = {
      orderId,
      items: validatedItems.map((i) => ({
        productId: i.productId,
        qty: i.qty,
      })),
    };
    const result = await this.broker.send<IReserveResult>({ topic, payload });

    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );

    return result;
  }

  async release(reservationId: string): Promise<void> {
    const topic = INVENTORY_TOPICS.RELEASE;
    this.logger.log(`send ${topic} with reservationId: ${reservationId}`);
    const payload: IReleaseRequest = { reservationId };
    await this.broker.send({ topic, payload });
    this.logger.log(`send ${topic} with completed.`);
  }
}
