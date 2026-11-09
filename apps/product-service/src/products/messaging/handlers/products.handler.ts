import { Injectable, OnModuleInit } from '@nestjs/common';
import { ProductsService } from '../../products.service';
import { BrokerEvent, BrokerMessage, BrokerService } from '@app/broker';
import { INVENTORY_TOPICS, PRODUCT_TOPICS } from '@app/contracts';
import type {
  IProductValidateRequest,
  IStockChangedEvent,
} from '@app/contracts';

@Injectable()
export class ProductsHandler implements OnModuleInit {
  constructor(
    private readonly broker: BrokerService,
    private readonly productsService: ProductsService,
  ) {}

  async onModuleInit() {
    await this.broker.subscribe([this]);
  }

  // Order service gọi qua NATS để validate + lấy giá trước khi checkout
  @BrokerMessage(PRODUCT_TOPICS.VALIDATE)
  async onValidateProducts(data: IProductValidateRequest) {
    return this.productsService.validateProducts(data.items);
  }

  @BrokerEvent(INVENTORY_TOPICS.STOCK_CHANGED)
  async onStockChanged(payload: IStockChangedEvent) {
    for (const product of payload) {
      await this.productsService.update(
        product.productId,
        {
          availableStock: product.availableStock,
        },
        'system',
      );
    }
  }
}
