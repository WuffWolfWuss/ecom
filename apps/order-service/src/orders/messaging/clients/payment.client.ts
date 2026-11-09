import { BrokerService } from '@app/broker';
import {
  IPaymentChargeRequest,
  IPaymentChargeResult,
  IPaymentRefundRequest,
  IPaymentRefundResult,
  IPaymentStatus,
  IPaymentStatusRequest,
  PAYMENT_TOPICS,
} from '@app/contracts';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PaymentClient {
  private readonly logger = new Logger(PaymentClient.name);
  constructor(private readonly broker: BrokerService) {}

  async paymentRefund(orderId: string): Promise<void> {
    const topic = PAYMENT_TOPICS.REFUND;
    this.logger.log(`send ${topic} with orderId: ${orderId}`);

    const payload: IPaymentRefundRequest = { orderId };
    const result = await this.broker.send<IPaymentRefundResult>({
      topic,
      payload,
    });
    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );
  }

  async paymentCharge(
    orderId: string,
    userId: string,
    total: number,
  ): Promise<IPaymentChargeResult> {
    const topic = PAYMENT_TOPICS.CHARGE;
    this.logger.log(`send ${topic} with orderId: ${orderId}`);

    const payload: IPaymentChargeRequest = { orderId, userId, amount: total };
    const result = await this.broker.send<IPaymentChargeResult>({
      topic,
      payload,
    });

    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );

    return result;
  }

  async getPaymentStatus(orderId: string): Promise<IPaymentStatus> {
    const topic = PAYMENT_TOPICS.CHECK_STATUS;
    this.logger.log(`send ${topic} with orderId: ${orderId}`);

    const payload: IPaymentStatusRequest = { orderId };
    const result = await this.broker.send<IPaymentStatus>({ topic, payload });
    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );

    return result;
  }
}
