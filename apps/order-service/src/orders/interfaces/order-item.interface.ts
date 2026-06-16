export interface IOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  price: number;
  qty: number;
  subtotal: number;
}

export interface IProductValidateResult {
  productId: string;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
}
