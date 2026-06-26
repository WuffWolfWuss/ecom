/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { OutboxEvent, OutboxStatus } from '@app/database';
import { BrokerService } from '@app/broker';

const MAX_RETRY = 5;
const BATCH_SIZE = 50;

@Injectable()
export class OutboxDispatcherService {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly broker: BrokerService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async dispatch() {
    if (this.running) return;
    this.running = true;

    try {
      await this.dataSource.transaction(async (manager) => {
        const rows: OutboxEvent[] = await manager
          .createQueryBuilder(OutboxEvent, 'o')
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .where('o.status = :status', {
            status: OutboxStatus.PENDING,
          })
          .orderBy('o.createdAt', 'ASC')
          .limit(BATCH_SIZE)
          .getMany();

        if (rows.length === 0) return;

        const repo = manager.getRepository(OutboxEvent);

        for (const row of rows) {
          this.logger.log(
            `Outbox event ${row.id} (${row.topic}) found. Publish event...`,
          );
          try {
            await this.broker.publish({
              topic: row.topic,
              payload: row.payload,
            });
            row.status = OutboxStatus.PUBLISHED;
            row.publishedAt = new Date();
            row.lastError = null;
          } catch (err) {
            row.retryCount = (row.retryCount ?? 0) + 1;
            row.lastError = (err as Error).message;
            if (row.retryCount >= MAX_RETRY) {
              row.status = OutboxStatus.FAILED;
              this.logger.error(
                `Outbox event ${row.id} (${row.topic}) failed permanently after ${MAX_RETRY} retries`,
              );
            }
          }
          await repo.save(row);
        }
      });
    } catch (err) {
      this.logger.error(`Dispatch loop error: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
