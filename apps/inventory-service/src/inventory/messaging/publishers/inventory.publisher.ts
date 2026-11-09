import { BrokerService } from '@app/broker';
import { INVENTORY_TOPICS, IStockChangedEvent } from '@app/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { Inventory } from '../../entities/inventory.entity';

@Injectable()
export class InventoryPublisher {
  private readonly logger = new Logger(InventoryPublisher.name);
  constructor(private readonly broker: BrokerService) {}

  async stockChanged(inventories?: Inventory[]): Promise<void> {
    if (!inventories?.length) return;
    const topic = INVENTORY_TOPICS.STOCK_CHANGED;
    this.logger.log(`publish ${topic}...`);

    const payload: IStockChangedEvent = inventories.map((inv) => ({
      productId: inv.productId,
      availableStock: inv.available,
    }));
    await this.broker.publish({ topic, payload });

    this.logger.log(`publish ${topic} completed.`);
  }
}
