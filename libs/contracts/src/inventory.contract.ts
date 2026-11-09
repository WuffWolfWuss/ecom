import { ILineItem } from './common.contract';

export const INVENTORY_TOPICS = {
  /** NATS — reserve stock for an order. */
  RESERVE: 'inventory.reserve',
  /** NATS — release a reservation (saga compensation / timeout). */
  RELEASE: 'inventory.release',
  /** NATS — check whether a reservation exists for an order. */
  GET_RESERVATION_STATUS: 'inventory.getReservationStatus',
  /** Kafka — available stock changed for one or more products. */
  STOCK_CHANGED: 'inventory.stock-changed',
} as const;

export interface IReserveRequest {
  orderId: string;
  items: ILineItem[];
}

export interface IReserveResult {
  success: boolean;
  reservationId: string;
  reason?: string;
}

export interface IReleaseRequest {
  reservationId: string;
}

export interface IReservationStatusRequest {
  orderId: string;
}

export interface IReservationStatus {
  exists: boolean;
  reservationId?: string;
}

export interface IStockChangedItem {
  productId: string;
  availableStock: number;
}

/** Kafka payload of `inventory.stock-changed`. */
export type IStockChangedEvent = IStockChangedItem[];
