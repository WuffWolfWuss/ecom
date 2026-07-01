import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PaymentsRepository } from './payments.repository';
import { ChargeDto } from './dto/charge.dto';
import { EPaymentStatus } from './constants/enum';
import { OutboxService } from '@app/outbox';
import { DataSource } from 'typeorm';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly outbox: OutboxService,
    private readonly dataSource: DataSource,
  ) {}

  async charge(dto: ChargeDto) {
    // Idempotency check — tránh charge 2 lần cùng 1 order
    this.logger.log(`[PAY] charging order...`);
    const existing = await this.repo.findByOrderId(dto.orderId);
    if (existing) {
      if (existing.status === EPaymentStatus.SUCCEEDED)
        return { success: true, transactionId: existing.transactionId };
      throw new BadRequestException('Payment already attempted for this order');
    }

    const payment = await this.repo.create(dto);

    try {
      // Simulate payment gateway call
      const transactionId = await this.processPayment(
        payment.amount,
        payment.method,
      );

      await this.dataSource.transaction(async (manager) => {
        await this.repo.updateStatus(
          payment.orderId,
          EPaymentStatus.SUCCEEDED,
          { transactionId },
          manager,
        );

        await this.outbox.addEvent(manager, 'payment.succeeded', {
          id: payment.orderId,
          orderId: payment.orderId,
          userId: payment.userId,
          transactionId,
        });
      });

      return { success: true, transactionId };
    } catch (error) {
      await this.repo.updateStatus(payment.orderId, EPaymentStatus.FAILED, {
        failureReason: error.message,
      });

      throw error;
    }
  }

  async refund(orderId: string) {
    const payment = await this.repo.findByOrderId(orderId);
    if (!payment) return { success: true, reason: 'NO_PAYMENT_FOUND' };

    switch (payment.status) {
      case EPaymentStatus.REFUNDED:
        return { success: true, reason: 'ALREADY_REFUNDED' };

      case EPaymentStatus.FAILED:
        return { success: true, reason: 'PAYMENT_NOT_SUCCEEDED' };

      case EPaymentStatus.PENDING:
        return { success: false, reason: 'PAYMENT_STILL_PENDING' };

      default:
        break;
    }

    try {
      // Production: gọi Stripe refund API
      await this.processRefund(payment.transactionId);

      await this.dataSource.transaction(async (manager) => {
        await this.repo.updateStatus(
          orderId,
          EPaymentStatus.REFUNDED,
          undefined,
          manager,
        );

        await this.outbox.addEvent(manager, 'payment.refunded', {
          id: orderId,
          orderId,
          userId: payment.userId,
        });
      });

      return { success: true, reason: 'REFUNDED' };
    } catch (error) {
      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
  }

  async getPaymentByOrder(orderId: string) {
    const payment = await this.repo.findByOrderId(orderId);
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async getMyPayments(userId: string) {
    return this.repo.findByUserId(userId);
  }

  // Simulate gateway — thay bằng Stripe trong production
  private async processPayment(
    amount: number,
    method: string,
  ): Promise<string> {
    await new Promise((r) => setTimeout(r, 300)); // giả lập latency

    // Giả lập 50% fail rate để test saga rollback
    const succeeded_chance = Math.random();
    this.logger.log(`[PAY] sucess chance: ${succeeded_chance} < 0.6`);
    if (succeeded_chance < 0.6) throw new Error('Payment gateway error');

    return `txn_${Date.now()}`;
  }

  private async processRefund(transactionId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 200));
    // Stripe: await stripe.refunds.create({ charge: transactionId });
  }
}
