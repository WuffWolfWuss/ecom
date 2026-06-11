import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { ChargeDto } from './dto/charge.dto';
import { EPaymentStatus } from './constants/enum';

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
  ) {}

  async create(dto: ChargeDto): Promise<Payment> {
    return this.repo.save(this.repo.create(dto));
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { orderId } });
  }

  async findByUserId(userId: string): Promise<Payment[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(
    orderId: string,
    status: EPaymentStatus,
    data?: { transactionId?: string; failureReason?: string },
  ): Promise<void> {
    await this.repo.update({ orderId }, { status, ...data });
  }
}
