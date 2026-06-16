import { BrokerService } from '@app/broker';
import { Injectable } from '@nestjs/common';

export interface OrderItem {
  productId: string;
  qty: number;
}

export interface OrderDetail {
  orderId: string;
  items: OrderItem[];
}

// Service Client pt
@Injectable()
export class OrderClient {
  constructor(private readonly broker: BrokerService) {}

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const result = await this.broker.send<OrderDetail>({
      topic: 'order.getItems',
      payload: { orderId },
    });
    return result?.items || [];
  }
}
