// apps/order-service/src/health/health.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { HEALTH_MODULE_OPTIONS, HealthModuleOptions } from './constant';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { KafkaHealthIndicator } from './indicator/kafka.health';
import { NatsHealthIndicator } from './indicator/nats.health';

@Module({})
export class HealthModule {
  static forRoot(options: HealthModuleOptions = {}): DynamicModule {
    return {
      module: HealthModule,
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        KafkaHealthIndicator,
        NatsHealthIndicator,
        { provide: HEALTH_MODULE_OPTIONS, useValue: options },
      ],
    };
  }
}
