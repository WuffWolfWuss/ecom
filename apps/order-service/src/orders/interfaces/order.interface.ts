import { OrderItem } from '../entities/order-item.entity';
import { EOrderStatus } from '../enums/order-status.enum';

export interface IOrder {
  id: string;
  userId: string;
  status: EOrderStatus;
  totalAmount: number;
  failureReason: string;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IVerifySagaResult {
  happened: boolean;
  reservationId?: string;
  transactionId?: string;
}
