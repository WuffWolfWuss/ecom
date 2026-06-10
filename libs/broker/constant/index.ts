// Metadata key for storing topic-handler mappings
export const KAFKA_HANDLER_METADATA_KEY = 'kafka:handlers';
export const NATS_HANDLER_METADATA_KEY = 'nats:handlers';

export interface KafkaSubscription {
  topic: string;
  handler: string; // method name
}

export interface NatsSubscription {
  topic: string;
  handler: string; // method name
}