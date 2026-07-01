import { Entity, Column, OneToMany } from 'typeorm';
import { EOrderStatus } from '../enums/order-status.enum';
import { OrderItem } from './order-item.entity';
import { IOrder } from '../interfaces/order.interface';
import { BaseEntity } from '@app/database';

@Entity('orders')
export class Order extends BaseEntity implements IOrder {
  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @Column({
    type: 'enum',
    enum: EOrderStatus,
    default: EOrderStatus.PENDING,
  })
  status: EOrderStatus;

  @Column({ nullable: true })
  paymentId: string;

  @Column({ nullable: true })
  failureReason: string;
}
