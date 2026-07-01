import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { ChargeDto } from '../dto/charge.dto';
import { BrokerService, BrokerMessage } from '@app/broker';
import { EPaymentStatus } from '../constants/enum';

@Injectable()
export class PaymentEventHandler implements OnModuleInit {
  constructor(
    private readonly broker: BrokerService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async onModuleInit() {
    await this.broker.subscribe([this]);
  }

  // Order saga gọi qua NATS để charge tiền
  @BrokerMessage('payment.charge')
  async onCharge(data: ChargeDto) {
    return this.paymentsService.charge(data);
  }

  // Order saga gọi qua NATS để refund khi rollback
  @BrokerMessage('payment.refund')
  async onRefund(data: { orderId: string }) {
    return this.paymentsService.refund(data.orderId);
  }

  @BrokerMessage('payment.checkStatus')
  async checkStatus(data: { orderId: string }) {
    const payment = await this.paymentsService.getPaymentByOrder(data.orderId);
    if (payment.status !== EPaymentStatus.SUCCEEDED) {
      throw new NotFoundException('Payment Not Succeeded.');
    }
    return { exists: true, transactionId: payment.id };
  }
}
