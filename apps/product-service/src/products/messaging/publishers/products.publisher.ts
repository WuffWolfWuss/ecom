import { BrokerService } from '@app/broker';
import { IProductCreatedEvent, PRODUCT_TOPICS } from '@app/contracts';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsPublisher {
  constructor(private readonly broker: BrokerService) {}

  // Inventory service tạo stock record khi nhận event này
  async productCreated(productId: string, name: string): Promise<void> {
    const payload: IProductCreatedEvent = { productId, name };
    await this.broker.publish({ topic: PRODUCT_TOPICS.CREATED, payload });
  }
}
