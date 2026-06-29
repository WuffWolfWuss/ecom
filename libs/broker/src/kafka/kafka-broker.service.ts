/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-useless-catch */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Admin,
  Consumer,
  EachMessagePayload,
  Kafka,
  Partitioners,
  Producer,
  ProducerRecord,
} from 'kafkajs';
import { KAFKA_HANDLER_METADATA_KEY, KafkaSubscription } from '../../constant';
import { IEventPayload, IKafkaBroker } from '../../constant/interfaces';

@Injectable()
export class KafkaBrokerService
  implements IKafkaBroker, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KafkaBrokerService.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private readonly consumer: Consumer;
  private readonly admin: Admin;
  private readonly handlers: Map<
    string | RegExp,
    (payload: EachMessagePayload) => Promise<void>
  > = new Map();
  private initialized = false;
  private consumerRunning = false;
  private pendingTopics: string[] = [];

  constructor(private readonly config: ConfigService) {
    this.kafka = new Kafka({
      clientId: this.config.get('KAFKA_CLIENT_ID', 'ecom-app'),
      brokers: [this.config.get('KAFKA_BROKER', 'localhost:9092')],
      retry: { initialRetryTime: 100, retries: 8 },
    });
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      createPartitioner: Partitioners.LegacyPartitioner,
    });
    this.consumer = this.kafka.consumer({
      groupId: config.get('KAFKA_GROUP_ID', 'ecom-group'),
      allowAutoTopicCreation: true,
      // Tăng session timeout — Kafka broker chờ lâu hơn trước khi kick consumer
      sessionTimeout: 30000,

      // Heartbeat phải nhỏ hơn sessionTimeout / 3
      heartbeatInterval: 3000,

      // Thời gian tối đa giữa 2 lần poll
      maxWaitTimeInMs: 5000,

      // RoundRobin assign lại partition nhanh hơn
      // partitionAssigners: [PartitionAssigners.roundRobin],
      retry: { initialRetryTime: 300, maxRetryTime: 10000, retries: 3 },
    });
    this.admin = this.kafka.admin();
  }

  async onModuleInit() {
    await this.initialize();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.initialized = true;
      this.logger.log('Kafka connected');
    } catch (error) {
      this.logger.warn(`Kafka unavailable: ${(error as Error).message}`);
    }
  }

  // Publish event (fire-and-forget)
  async send(topic: string, messages: { key?: string; value: any }[]) {
    await this.initialize();
    const record: ProducerRecord = {
      topic,
      messages: messages.map((m) => ({ key: m.key ?? null, value: m.value })),
    };
    await this.producer.send(record);
  }

  async subscribe(topic: string, payload: IEventPayload) {
    await this.initialize();

    try {
      this.logger.log('subscribe - Kafka create topic: ', topic);
      // await this.createTopicIfNotExists(topic);
      this.handlers.set(topic, payload.handler);
      this.pendingTopics.push(topic);
      // await this.consumer.subscribe({ topics: [topic], fromBeginning: true });
    } catch (error: any) {
      throw error;
    }
  }

  async setupSubscriptions(instance: any) {
    const subscriptions: KafkaSubscription[] =
      Reflect.getMetadata(KAFKA_HANDLER_METADATA_KEY, instance.constructor) ||
      [];

    for (const { topic, handler } of subscriptions) {
      const method = instance[handler];
      if (typeof method !== 'function') {
        throw new Error(
          `Handler "${handler}" is not a function on ${instance.constructor.name}`,
        );
      }
      await this.subscribe(topic, {
        handler: async (payload: EachMessagePayload) => {
          const value = payload.message.value
            ? JSON.parse(payload.message.value.toString())
            : null;
          await method.call(instance, value, payload);
        },
      });
    }
  }

  async disconnect() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    this.initialized = false;
    this.consumerRunning = false;
  }

  async startConsumer() {
    if (this.consumerRunning || this.pendingTopics.length === 0) return;

    await this.consumer.subscribe({
      topics: this.pendingTopics, // subscribe tất cả một lần
      fromBeginning: false, // chỉ đọc event mới — xem lý do bên dưới
    });

    await this.consumer.run({
      eachMessage: async (payload) => {
        for (const [pattern, handler] of this.handlers) {
          const match =
            typeof pattern === 'string'
              ? pattern === payload.topic
              : pattern.test(payload.topic);

          if (match) {
            try {
              await handler(payload);
            } catch (err) {
              console.error('Kafka handler error:', err);
            }
          }
        }
      },
    });

    this.consumerRunning = true;
    this.logger.log(
      `[Kafka] consuming topics: ${this.pendingTopics.join(', ')}`,
    );
  }

  private async createTopicIfNotExists(topic: string) {
    const admin = this.kafka.admin();
    await admin.connect();
    try {
      const existing = await admin.listTopics();
      if (!existing.includes(topic)) {
        await admin.createTopics({
          topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
        });
        console.log(`Topic "${topic}" created`);
      }
    } finally {
      await admin.disconnect();
    }
  }

  async ping(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Kafka producer not initialized');
    }

    await this.producer.send({
      topic: '__health_check',
      messages: [{ value: 'ping' }],
    });
  }
}
