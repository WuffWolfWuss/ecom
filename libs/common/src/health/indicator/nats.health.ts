import { BrokerService } from '@app/broker';
import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

@Injectable()
export class NatsHealthIndicator {
  constructor(
    private readonly health: HealthIndicatorService,
    private readonly broker: BrokerService,
  ) {}

  async isHealthy(key = 'nats'): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      await this.broker.pingNats();
      return indicator.up();
    } catch (error) {
      return indicator.down({ error: (error as Error).message });
    }
  }
}
