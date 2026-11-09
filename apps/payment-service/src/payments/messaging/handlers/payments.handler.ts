import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PaymentsService } from '../../payments.service';
import { ChargeDto } from '../../dto/charge.dto';
import { BrokerService, BrokerMessage } from '@app/broker';
import { PAYMENT_TOPICS } from '@app/contracts';
import type {
  IPaymentRefundRequest,
  IPaymentStatus,
  IPaymentStatusRequest,
} from '@app/contracts';
import { EPaymentStatus } from '../../enums/payment.enum';

@Injectable()
export class PaymentsHandler implements OnModuleInit {
  constructor(
    private readonly broker: BrokerService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async onModuleInit() {
    await this.broker.subscribe([this]);
  }

  // Order saga gọi qua NATS để charge tiền
  @BrokerMessage(PAYMENT_TOPICS.CHARGE)
  async onCharge(data: ChargeDto) {
    return this.paymentsService.charge(data);
  }

  // Order saga gọi qua NATS để refund khi rollback
  @BrokerMessage(PAYMENT_TOPICS.REFUND)
  async onRefund(data: IPaymentRefundRequest) {
    return this.paymentsService.refund(data.orderId);
  }

  @BrokerMessage(PAYMENT_TOPICS.CHECK_STATUS)
  async checkStatus(data: IPaymentStatusRequest): Promise<IPaymentStatus> {
    const payment = await this.paymentsService.getPaymentByOrder(data.orderId);
    if (payment.status !== EPaymentStatus.SUCCEEDED) {
      throw new NotFoundException('Payment Not Succeeded.');
    }
    return { exists: true, transactionId: payment.id };
  }
}
