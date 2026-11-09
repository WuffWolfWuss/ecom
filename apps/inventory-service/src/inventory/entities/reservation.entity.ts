import { BaseEntity } from '@app/database';
import { Entity, Column } from 'typeorm';
import { EReservationStatus } from '../enums/reservation-status.enum';

@Entity('reservations')
export class Reservation extends BaseEntity {
  @Column({ unique: true })
  orderId: string; // unique để chặn reserve trùng cho cùng 1 order

  @Column({
    type: 'enum',
    enum: EReservationStatus,
    default: EReservationStatus.RESERVED,
  })
  status: EReservationStatus;

  @Column({ type: 'jsonb' })
  items: { productId: string; qty: number }[];
}
