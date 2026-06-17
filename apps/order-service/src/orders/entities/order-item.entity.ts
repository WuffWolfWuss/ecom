import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { IOrderItem } from '../interfaces/order-item.interface';
import { BaseEntity } from '@app/database';

@Entity('order_items')
export class OrderItem extends BaseEntity implements IOrderItem {
  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @Column()
  productId: string;

  @Column()
  productName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column()
  qty: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
}
