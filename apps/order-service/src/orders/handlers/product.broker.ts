import { BrokerService } from '@app/broker';
import { Injectable, Logger } from '@nestjs/common';
import { IProductValidateResult } from '../interfaces/order-item.interface';

@Injectable()
export class ProductBrokerService {
  private readonly logger = new Logger(ProductBrokerService.name);
  constructor(private readonly broker: BrokerService) {}

  async productValidate(
    items: { productId: string; qty: number }[],
  ): Promise<IProductValidateResult[]> {
    const topic = 'product.validate';
    this.logger.log(`send ${topic} for items validation.`);

    const result = await this.broker.send<IProductValidateResult[]>({
      topic,
      payload: { items },
    });
    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );

    return result;
  }
}
