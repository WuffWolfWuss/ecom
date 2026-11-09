export const PAYMENT_TOPICS = {
  /** NATS — charge an order. */
  CHARGE: 'payment.charge',
  /** NATS — refund an order (saga compensation / cancel). */
  REFUND: 'payment.refund',
  /** NATS — check whether an order has a succeeded payment. */
  CHECK_STATUS: 'payment.checkStatus',
  /** Kafka — payment succeeded (published via outbox). */
  SUCCEEDED: 'payment.succeeded',
  /** Kafka — payment refunded (published via outbox). */
  REFUNDED: 'payment.refunded',
} as const;

export interface IPaymentChargeRequest {
  orderId: string;
  userId: string;
  amount: number;
}

export interface IPaymentChargeResult {
  success: boolean;
  transactionId: string;
}

export interface IPaymentRefundRequest {
  orderId: string;
}

export interface IPaymentRefundResult {
  success: boolean;
  reason: string;
}

export interface IPaymentStatusRequest {
  orderId: string;
}

export interface IPaymentStatus {
  exists: boolean;
  transactionId: string;
}

export interface IPaymentSucceededEvent {
  id: string;
  orderId: string;
  userId: string;
  transactionId: string;
}

export interface IPaymentRefundedEvent {
  id: string;
  orderId: string;
  userId: string;
}
