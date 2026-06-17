import { Global, Module } from '@nestjs/common';
import { BrokerService } from './broker.service';
import { KafkaBrokerService } from './kafka/kafka-broker.service';
import { NatsBrokerService } from './nats/nats-broker.service';

@Global()
@Module({
  providers: [BrokerService, KafkaBrokerService, NatsBrokerService],
  exports: [BrokerService],
})
export class BrokerModule {}
