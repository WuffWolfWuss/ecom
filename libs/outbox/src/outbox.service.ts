import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { OutboxEvent, OutboxStatus } from './outbox-event.entity';

@Injectable()
export class OutboxService {
  async addEvent(
    manager: EntityManager,
    topic: string,
    payload: Record<string, any>,
  ): Promise<void> {
    const repo = manager.getRepository(OutboxEvent);
    await repo.save(
      repo.create({
        topic,
        payload,
        status: OutboxStatus.PENDING,
      }),
    );
  }
}
