import { ILineItem } from './common.contract';

export const PRODUCT_TOPICS = {
  /** NATS — validate products and return current prices. */
  VALIDATE: 'product.validate',
  /** Kafka — a product was created. */
  CREATED: 'product.created',
} as const;

export interface IProductValidateRequest {
  items: ILineItem[];
}

export interface IProductValidateResult {
  productId: string;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
}

export interface IProductCreatedEvent {
  productId: string;
  name: string;
}
