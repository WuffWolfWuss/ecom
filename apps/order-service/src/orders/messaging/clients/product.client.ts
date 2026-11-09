import { BrokerService } from '@app/broker';
import {
  ILineItem,
  IProductValidateRequest,
  IProductValidateResult,
  PRODUCT_TOPICS,
} from '@app/contracts';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ProductClient {
  private readonly logger = new Logger(ProductClient.name);
  constructor(private readonly broker: BrokerService) {}

  async productValidate(items: ILineItem[]): Promise<IProductValidateResult[]> {
    const topic = PRODUCT_TOPICS.VALIDATE;
    this.logger.log(`send ${topic} for items validation.`);

    const payload: IProductValidateRequest = { items };
    const result = await this.broker.send<IProductValidateResult[]>({
      topic,
      payload,
    });
    this.logger.log(
      `topic ${topic} return with data: ${JSON.stringify(result)}`,
    );

    return result;
  }
}
