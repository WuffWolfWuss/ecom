import { BrokerService } from '@app/broker';
import { Injectable, Logger } from '@nestjs/common';

interface IPaymentChargeResult {
  success: boolean;
  transactionId: string;
}

@Injectable()
export class PaymentBrokerService {
  private readonly logger = new Logger(PaymentBrokerService.name);
  constructor(private readonly broker: BrokerService) {}

  async getReservationStatus(
    orderId: string,
    userId: string,
    total: number,
  ): Promise<IPaymentChargeResult> {
    const topic = 'payment.charge';
    this.logger.log(`send ${topic} with orderId: ${orderId}`);

    const result = await this.broker.send<IPaymentChargeResult>({
      topic,
      payload: {
        orderId,
        userId,
        amount: total,
      },
    });
    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );

    return result;
  }

  async paymentRefund(orderId: string): Promise<void> {
    const topic = 'payment.refund';
    this.logger.log(`send ${topic} with orderId: ${orderId}`);

    const result = await this.broker.send({
      topic,
      payload: { orderId },
    });
    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );
  }

  async paymentCharge(
    orderId: string,
    userId: string,
    total: number,
  ): Promise<{
    success: boolean;
    transactionId: string;
  }> {
    const topic = 'payment.charge';
    this.logger.log(`send ${topic} with orderId: ${orderId}`);

    const result = await this.broker.send<{
      success: boolean;
      transactionId: string;
    }>({
      topic,
      payload: {
        orderId: orderId,
        userId: userId,
        amount: total,
      },
    });

    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );

    return result;
  }

  async getPaymentStatus(
    orderId: string,
  ): Promise<{ exists: boolean; transactionId: string }> {
    const topic = 'payment.checkStatus';
    this.logger.log(`send ${topic} with orderId: ${orderId}`);

    const result = await this.broker.send<{
      exists: boolean;
      transactionId: string;
    }>({
      topic,
      payload: { orderId },
    });
    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );

    return result;
  }
}
