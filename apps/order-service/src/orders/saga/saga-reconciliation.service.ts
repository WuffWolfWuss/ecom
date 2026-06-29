import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { SagaState, SagaStatus } from '@app/database';
import { ESagaStep } from '../enums/saga-steps.enum';
import { PlaceOrderSaga } from './place-order.saga';
import { IVerifySagaResult } from '../interfaces/order.interface';

// Saga xử lí quá 15p
const STUCK_THRESHOLD_MS = 16 * 60 * 1000;
const MAX_VERIFY_RETRY = 3;

@Injectable()
export class SagaReconciliationService {
  private readonly logger = new Logger(SagaReconciliationService.name);
  private running = false;

  constructor(
    @InjectRepository(SagaState)
    private readonly sagaRepo: Repository<SagaState>,
    private readonly saga: PlaceOrderSaga,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async reconcile() {
    if (this.running) return;
    this.running = true;

    try {
      // Bắt mọi saga IN_PROGRESS quá lâu.
      const stuck = await this.sagaRepo.find({
        where: [
          {
            status: SagaStatus.IN_PROGRESS,
            updatedAt: LessThan(new Date(Date.now() - STUCK_THRESHOLD_MS)),
          },
          {
            status: SagaStatus.COMPENSATING,
            updatedAt: LessThan(new Date(Date.now() - STUCK_THRESHOLD_MS)),
          },
        ],
        take: 50,
      });

      for (const saga of stuck) {
        this.logger.warn(
          `[Reconciliation] Stuck saga found: order ${saga.id}, step ${saga.currentStep}`,
        );
        await this.handleStuckSaga(saga).catch((err) =>
          this.logger.error(
            `[Reconciliation] order ${saga.id} failed: ${(err as Error).message}`,
          ),
        );
      }
    } catch (err) {
      this.logger.error(`Reconciliation error: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async handleStuckSaga(sagaState: SagaState) {
    if (sagaState.currentStep === ESagaStep.VALIDATE_PRODUCT.toString()) {
      await this.saga.compensateFromState(sagaState);
      return;
    }

    const alreadyConfirmed =
      (sagaState.currentStep === ESagaStep.RESERVE_INVENTORY.toString() &&
        !!sagaState.reservationId) ||
      (sagaState.currentStep === ESagaStep.CHARGE_PAYMENT.toString() &&
        !!sagaState.transactionId);

    if (alreadyConfirmed) {
      await this.saga.compensateFromState(sagaState);
      return;
    }

    let result: IVerifySagaResult;
    try {
      result = await this.saga.verifyStepOutcome(
        sagaState.currentStep,
        sagaState.id,
      );
    } catch (verifyError) {
      // Verify vẫn fail — tăng retry counter, KHÔNG compensate.
      sagaState.verifyRetryCount = (sagaState.verifyRetryCount ?? 0) + 1;
      sagaState.lastError = `Verify retry ${sagaState.verifyRetryCount} failed: ${(verifyError as Error).message}`;
      await this.sagaRepo.save(sagaState);

      if (sagaState.verifyRetryCount >= MAX_VERIFY_RETRY) {
        sagaState.status = SagaStatus.FAILED;
        await this.sagaRepo.save(sagaState);
        this.logger.error(
          `[Reconciliation] order ${sagaState.id} exceeded max verify retries — needs manual review`,
        );
      }
      return; // retry tiếp, hoặc đã chuyển FAILED để dừng hẳn
    }

    // Verify thành công
    if (result.happened) {
      if (result.reservationId) sagaState.reservationId = result.reservationId;
      if (result.transactionId) sagaState.transactionId = result.transactionId;
      await this.sagaRepo.save(sagaState);
    }

    await this.saga.compensateFromState(sagaState);
  }
}
