/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  Msg,
  NatsConnection,
  Subscription,
} from '@nats-io/transport-node';
import { NATS_HANDLER_METADATA_KEY, NatsSubscription } from '../../constant';

@Injectable()
export class NatsBrokerService implements OnModuleDestroy {
  private connection!: NatsConnection;
  private readonly subscriptions = new Map<string, Subscription>();

  constructor(private readonly config: ConfigService) {}

  private async initialize() {
    if (this.connection) return;
    this.connection = await connect({
      servers: this.config.get('NATS_URL', 'nats://localhost:4222'),
    });
  }

  // Request-reply message (chờ response)
  async send<T>(topic: string, payload: any): Promise<T> {
    await this.initialize();
    const response = await this.connection.request(
      topic,
      JSON.stringify(payload),
      { timeout: 5000 },
    );
    return response.json() as T;
  }

  async subscribe(
    topic: string,
    handler: (data: any, msg: Msg) => Promise<any>,
  ) {
    await this.initialize();
    if (this.subscriptions.has(topic)) return;

    const sub = this.connection.subscribe(topic, {
      callback: (err, msg) => {
        if (err) return;
        const data = msg?.json();
        void (async () => {
          try {
            const response = await handler(data, msg);
            if (msg.reply && response !== undefined) {
              msg.respond(JSON.stringify(response));
            }
          } catch (error) {
            console.error(`NATS handler error for ${topic}:`, error);
          }
        })();
      },
    });
    this.subscriptions.set(topic, sub);
  }

  async setupSubscriptions(instance: any) {
    const subscriptions: NatsSubscription[] =
      Reflect.getMetadata(NATS_HANDLER_METADATA_KEY, instance.constructor) ||
      [];

    for (const { topic, handler } of subscriptions) {
      const method = instance[handler];
      if (typeof method !== 'function') {
        throw new Error(
          `Handler "${handler}" is not a function on ${instance.constructor.name}`,
        );
      }
      await this.subscribe(topic, async (data, msg) => {
        return method.call(instance, data, msg);
      });
    }
  }

  async onModuleDestroy() {
    for (const sub of this.subscriptions.values()) sub.unsubscribe();
    await this.connection?.drain();
    await this.connection?.close();
  }
}
