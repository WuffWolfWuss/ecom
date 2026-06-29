import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_SUBSCRIBER } from '@app/redis';
import { SagaState, SagaStatus } from '@app/database';
import { ESagaStep } from '../enums/saga-steps.enum';
import { PlaceOrderSaga } from './place-order.saga';

@Injectable()
export class SagaTimeoutListener implements OnModuleInit {
  private readonly logger = new Logger(SagaTimeoutListener.name);

  constructor(
    @Inject(REDIS_SUBSCRIBER) private readonly subscriber: Redis,
    @InjectRepository(SagaState)
    private readonly sagaRepo: Repository<SagaState>,
    private readonly saga: PlaceOrderSaga,
  ) {}

  async onModuleInit() {
    // DB index 0 mặc định
    await this.subscriber.subscribe('__keyevent@0__:expired');

    this.subscriber.on('message', (_channel, expiredKey) => {
      if (!expiredKey.startsWith('saga:timeout:')) return;
      const orderId = expiredKey.replace('saga:timeout:', '');
      void this.handleExpired(orderId);
    });

    this.logger.log(
      '[SagaTimeoutListener] Subscribed to Redis key expiry events',
    );
  }

  private async handleExpired(orderId: string) {
    const sagaState = await this.sagaRepo.findOne({ where: { id: orderId } });

    // Saga đã COMPLETED hoặc đã compensate rồi qua flow fail khác → bỏ qua
    if (!sagaState || sagaState.status !== SagaStatus.IN_PROGRESS) return;
    if (sagaState.currentStep !== ESagaStep.RESERVE_INVENTORY.toString())
      return;

    this.logger.warn(
      `[Timeout] Reservation timeout for order ${orderId}, compensating`,
    );
    await this.saga
      .compensateFromState(sagaState)
      .catch((err) =>
        this.logger.error(
          `[Timeout] compensate failed for ${orderId}: ${(err as Error).message}`,
        ),
      );
  }
}
