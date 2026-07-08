import { BrokerService } from '@app/broker';
import { Inventory } from '../entities/inventory.entity';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InventoryBrokerService {
  private readonly logger = new Logger(InventoryBrokerService.name);
  constructor(private readonly broker: BrokerService) {}

  async stockChanged(inventories?: Inventory[]): Promise<void> {
    if (!inventories?.length) return;
    const topic = 'inventory.stock-changed';
    this.logger.log(`publish ${topic}...`);

    await this.broker.publish({
      topic,
      payload: inventories.map((inv) => ({
        productId: inv.productId,
        availableStock: inv.available,
      })),
    });

    this.logger.log(`publish ${topic} completed.`);
  }
}
