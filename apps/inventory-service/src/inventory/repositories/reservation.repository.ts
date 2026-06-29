import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';

@Injectable()
export class ReservationRepository {
  constructor(
    @InjectRepository(Reservation)
    private readonly repo: Repository<Reservation>,
  ) {}

  async getReservationStatus(orderId: string) {
    const r = await this.repo.findOne({ where: { orderId } });
    return r
      ? { exists: true, reservationId: r.id, status: r.status }
      : { exists: false };
  }
}
