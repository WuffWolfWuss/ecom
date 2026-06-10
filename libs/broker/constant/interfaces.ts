import { EachMessagePayload } from "kafkajs";

export interface IEventPayload {
  handler: (payload: EachMessagePayload) => Promise<void>;
  retries?: number;
}

export interface IKafkaBroker {
  send(topic: string, messages: { key?: string; value: string }[]): Promise<void>;
  subscribe(topic: string, payload: IEventPayload): Promise<void>;
  disconnect(): Promise<void>;
  setupSubscriptions(instance: any): Promise<void>;
}