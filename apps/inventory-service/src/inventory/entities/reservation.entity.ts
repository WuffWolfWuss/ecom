import { BaseEntity } from '@app/database';
import { Entity, Column } from 'typeorm';
import { ReservationStatus } from '../interfaces/inventory';

@Entity('reservations')
export class Reservation extends BaseEntity {
  @Column({ unique: true })
  orderId: string; // unique để chặn reserve trùng cho cùng 1 order

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.RESERVED,
  })
  status: ReservationStatus;

  @Column({ type: 'jsonb' })
  items: { productId: string; qty: number }[];
}
