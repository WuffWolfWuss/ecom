/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  Msg,
  NatsConnection,
  Subscription,
} from '@nats-io/transport-node';
import { NATS_HANDLER_METADATA_KEY, NatsSubscription } from '../../constant';
import {
  AmbiguousRpcException,
  BusinessRpcException,
} from '../exceptions/broker.exceptions';
import { normalizeRpcError } from '../exceptions/rpc-filter.error';

@Injectable()
export class NatsBrokerService implements OnModuleDestroy {
  private readonly logger = new Logger(NatsBrokerService.name);
  private connection: NatsConnection | null = null;
  private connecting = false;
  private readonly subscriptions = new Map<string, Subscription>();

  constructor(private readonly config: ConfigService) {}

  private async initialize() {
    if (this.connection && !this.connection.isClosed()) return this.connection;
    if (this.connecting) return null;

    this.connecting = true;
    try {
      this.connection = await connect({
        servers: this.config.get('NATS_URL', 'nats://localhost:4222'),
        reconnect: true, // tự reconnect khi mất kết nối
        maxReconnectAttempts: 10,
        reconnectTimeWait: 2000, // chờ 2s giữa các lần retry
        timeout: 3000, // timeout 3s cho mỗi lần connect
      });
      this.logger.log('NATS connected');
      return this.connection;
    } catch (error) {
      this.logger.warn(`NATS unavailable: ${(error as Error).message}`);
      this.connection = null;
      return null;
    } finally {
      this.connecting = false;
    }
  }

  // Request-reply message (chờ response)
  async send<T>(topic: string, payload: any): Promise<T> {
    const conn = await this.initialize();
    if (!conn)
      throw new AmbiguousRpcException('NATS connection unavailable', topic);

    let raw: { success: boolean; data?: T; error?: any };
    try {
      const response = await conn.request(topic, JSON.stringify(payload), {
        timeout: 5000,
      });
      raw = response.json();
    } catch (error: any) {
      // No response, handle status unknown
      throw new AmbiguousRpcException(
        `Request to "${topic}" got no reply (${error.code ?? error.name ?? 'unknown'}).`,
        topic,
      );
    }

    // received response
    if (!raw.success) {
      throw new BusinessRpcException(raw.error?.message ?? 'Remote error', {
        topic,
        code: raw.error?.code,
        details: raw.error?.details,
      });
    }
    return raw.data as T;
  }

  async subscribe(
    topic: string,
    handler: (data: any, msg: Msg) => Promise<any>,
  ) {
    const conn = await this.initialize();
    if (!conn) {
      this.logger.warn(
        `Skipping NATS subscribe for "${topic}" — connection unavailable`,
      );
      return;
    }
    if (this.subscriptions.has(topic)) return;

    const sub = conn.subscribe(topic, {
      callback: (err, msg) => {
        if (err) return;
        const data = msg?.json();
        void (async () => {
          const response = await handler(data, msg);
          if (msg.reply) {
            msg.respond(JSON.stringify(response));
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
        try {
          const result = await method.call(instance, data, msg);
          return { success: true, data: result };
        } catch (error) {
          return normalizeRpcError(error, this.logger);
        }
      });
    }
  }

  async onModuleDestroy() {
    for (const sub of this.subscriptions.values()) sub.unsubscribe();
    await this.connection?.drain();
    await this.connection?.close();
  }

  async ping(): Promise<void> {
    const conn = await this.initialize(); // no-op nếu đã connected
    if (!conn || conn.isClosed()) {
      throw new Error('NATS connection is closed');
    }
  }
}
