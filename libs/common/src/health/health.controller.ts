// apps/order-service/src/health/health.controller.ts
import { Controller, Get, Inject, Optional } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MongooseHealthIndicator,
  HealthIndicatorFunction,
} from '@nestjs/terminus';
import { Public } from '@app/common';
import { HEALTH_MODULE_OPTIONS, type HealthModuleOptions } from './constant';
import { KafkaHealthIndicator } from './indicator/kafka.health';
import { NatsHealthIndicator } from './indicator/nats.health';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly kafka: KafkaHealthIndicator,
    private readonly nats: NatsHealthIndicator,
    @Optional() private readonly typeOrm?: TypeOrmHealthIndicator,
    @Optional() private readonly mongoose?: MongooseHealthIndicator,
    @Inject(HEALTH_MODULE_OPTIONS)
    private readonly options?: HealthModuleOptions,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const checks: HealthIndicatorFunction[] = [];
    if (this.options?.database === 'postgres' && this.typeOrm) {
      checks.push(() => this.typeOrm!.pingCheck('postgres'));
    }
    if (this.options?.database === 'mongo' && this.mongoose) {
      checks.push(() => this.mongoose!.pingCheck('mongodb'));
    }
    if (this.options?.kafka !== false) {
      checks.push(() => this.kafka.isHealthy());
    }
    if (this.options?.nats !== false) {
      checks.push(() => this.nats.isHealthy());
    }
    return this.health.check(checks);
  }
}
