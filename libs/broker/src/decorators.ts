import { KAFKA_HANDLER_METADATA_KEY, NATS_HANDLER_METADATA_KEY } from '../constant';

export function BrokerEvent(topic: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const existing = Reflect.getMetadata(KAFKA_HANDLER_METADATA_KEY, target.constructor) || [];
    existing.push({ topic, handler: propertyKey });
    Reflect.defineMetadata(KAFKA_HANDLER_METADATA_KEY, existing, target.constructor);
    return descriptor;
  };
}

export function BrokerMessage(topic: string) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const existing = Reflect.getMetadata(NATS_HANDLER_METADATA_KEY, target.constructor) || [];
    existing.push({ topic, handler: propertyKey });
    Reflect.defineMetadata(NATS_HANDLER_METADATA_KEY, existing, target.constructor);
    return descriptor;
  };
}