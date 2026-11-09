import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsRepository } from './repositories/payments.repository';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsHandler } from './messaging/handlers/payments.handler';
import { OutboxModule } from '@app/outbox';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), OutboxModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, PaymentsHandler],
})
export class PaymentsModule {}
