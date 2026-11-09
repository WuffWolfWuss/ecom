/** A product + quantity pair, shared by order, inventory and product messages. */
export interface ILineItem {
  productId: string;
  qty: number;
}
