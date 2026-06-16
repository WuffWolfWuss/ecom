import { Injectable, OnModuleInit } from '@nestjs/common';
import { ProductsService } from '../products.service';
import { BrokerMessage, BrokerService } from '@app/broker';

@Injectable()
export class ProductEventHandler implements OnModuleInit {
  constructor(
    private readonly broker: BrokerService,
    private readonly productsService: ProductsService,
  ) {}

  async onModuleInit() {
    await this.broker.subscribe([this]);
  }

  // Order service gọi qua NATS để validate + lấy giá trước khi checkout
  @BrokerMessage('product.validate')
  async onValidateProducts(data: {
    items: { productId: string; qty: number }[];
  }) {
    return this.productsService.validateProducts(data.items);
  }
}
