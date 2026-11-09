import { ILineItem } from './common.contract';
import { IProductValidateResult } from './product.contract';

export const ORDER_TOPICS = {
  /** NATS — get the line items of an order. */
  GET_ITEMS: 'order.getItems',
  /** Kafka — order placed and paid. */
  CONFIRMED: 'order.confirmed',
  /** Kafka — order cancelled. */
  CANCELLED: 'order.cancelled',
} as const;

export interface IOrderItemsRequest {
  orderId: string;
}

export interface IOrderItemsResult {
  orderId: string;
  items: ILineItem[];
}

export interface IOrderConfirmedEvent {
  orderId: string;
  userId: string;
  total: number;
  items: IProductValidateResult[];
}

export interface IOrderCancelledEvent {
  orderId: string;
  userId: string;
}
