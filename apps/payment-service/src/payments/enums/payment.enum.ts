export enum EPaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum EPaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  COD = 'COD', // cash on delivery
}
