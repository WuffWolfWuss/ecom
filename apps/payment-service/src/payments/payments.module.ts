import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentEventHandler } from './handlers/payment-event.handler';

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, PaymentEventHandler],
})
export class PaymentsModule {}
