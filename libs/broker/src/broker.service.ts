import { Injectable } from '@nestjs/common';
import { KafkaBrokerService } from './kafka/kafka-broker.service';
import { NatsBrokerService } from './nats/nats-broker.service';

@Injectable()
export class BrokerService {
  constructor(
    private readonly kafka: KafkaBrokerService,
    private readonly nats: NatsBrokerService,
  ) {}

  // Kafka — fire-and-forget event
  async publish(event: { topic: string; payload: any }) {
    await this.kafka.send(event.topic, [
      { key: event.payload.id, value: JSON.stringify(event.payload) },
    ]);
  }

  // NATS — request-reply message
  async send<T>(msg: { topic: string; payload: any }): Promise<T> {
    return this.nats.send<T>(msg.topic, msg.payload);
  }

  // Setup cả Kafka + NATS subscriptions từ decorator
  async subscribe(instances: object[]) {
    for (const instance of instances) {
      await this.kafka.setupSubscriptions(instance);
      await this.nats.setupSubscriptions(instance);
    }

    // Gọi sau khi tất cả handlers đã đăng ký xong
    await this.kafka.startConsumer();
  }

  async shutdown() {
    await this.kafka.disconnect();
    await this.nats.onModuleDestroy();
  }

  // Health check
  async pingKafka(): Promise<void> {
    await this.kafka.ping();
  }

  async pingNats(): Promise<void> {
    await this.nats.ping();
  }
}
