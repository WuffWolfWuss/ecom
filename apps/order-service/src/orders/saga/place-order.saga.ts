import { AmbiguousRpcException } from '@app/broker';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { IProductValidateResult } from '../interfaces/order-item.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { SagaState, SagaStatus } from '@app/database';
import { REDIS_CLIENT } from '@app/redis';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { ESagaStep } from '../enums/saga-steps.enum';
import { IVerifySagaResult } from '../interfaces/order.interface';
import {
  InventoryBrokerService,
  PaymentBrokerService,
  ProductBrokerService,
} from '../handlers';

const RESERVATION_TTL_SECONDS = 15 * 60;

interface SagaStep {
  name: string;
  execute: () => Promise<any>;
  compensate: () => Promise<void>;
}

interface InputOrder {
  orderId: string;
  userId: string;
  items: { productId: string; qty: number }[];
}

@Injectable()
export class PlaceOrderSaga {
  private readonly logger = new Logger(PlaceOrderSaga.name);
  constructor(
    private readonly inventoryBroker: InventoryBrokerService,
    private readonly paymentBroker: PaymentBrokerService,
    private readonly productBroker: ProductBrokerService,
    @InjectRepository(SagaState)
    private readonly sagaRepo: Repository<SagaState>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async execute(
    input: InputOrder,
  ): Promise<{ validatedItems: IProductValidateResult[]; total: number }> {
    const executedSteps: SagaStep[] = [];
    let validatedItems: IProductValidateResult[] = [];

    const saga = await this.sagaRepo.save(
      this.sagaRepo.create({
        id: input.orderId,
        currentStep: ESagaStep.VALIDATE_PRODUCT,
        status: SagaStatus.IN_PROGRESS,
        payload: { userId: input.userId, items: input.items },
      }),
    );

    const steps: SagaStep[] = [
      {
        name: ESagaStep.VALIDATE_PRODUCT,
        // Bước 1: validate product + lấy giá từ Product service
        execute: async () => {
          this.logger.log(
            `[SAGA] Order ${input.orderId} stepValidateProduct. Items: ${JSON.stringify(input.items.map((v) => v.productId))}`,
          );
          validatedItems = await this.productBroker.productValidate(
            input.items,
          );
        },
        compensate: async () => {}, // không cần rollback, chỉ là đọc data
      },
      {
        name: ESagaStep.RESERVE_INVENTORY,
        // Bước 2: reserve stock từ Inventory service
        execute: async () => {
          this.logger.log(`[SAGA] Order ${input.orderId} stepItemReserve`);
          const result = await this.inventoryBroker.reservation(
            input.orderId,
            validatedItems,
          );
          saga.reservationId = result.reservationId;
          await this.sagaRepo.save(saga);

          // Set saga timeout
          await this.redis.set(
            `saga:timeout:${input.orderId}`,
            saga.reservationId,
            'EX',
            RESERVATION_TTL_SECONDS,
          );
        },
        compensate: async () => {
          this.logger.log(
            `[SAGA] Order ${input.orderId} Failed. stepIntemReservceConpensate...`,
          );
          await this.inventoryBroker.release(saga.reservationId);
        },
      },
      {
        name: ESagaStep.CHARGE_PAYMENT,
        // Bước 3: charge tiền qua Payment service
        execute: async () => {
          this.logger.log(`[SAGA] Order ${input.orderId} stepPayment`);
          const total = validatedItems.reduce((sum, i) => sum + i.subtotal, 0);
          const result = await this.paymentBroker.paymentCharge(
            input.orderId,
            input.userId,
            total,
          );

          saga.transactionId = result.transactionId;
          await this.redis.del(`saga:timeout:${input.orderId}`);
        },
        compensate: async () => {
          this.logger.log(
            `[SAGA] Order ${input.orderId} Failed. stepPaymentConpensate...`,
          );
          await this.paymentBroker.paymentRefund(input.orderId);
        },
      },
    ];

    // Chạy từng bước
    for (const step of steps) {
      saga.currentStep = step.name;
      await this.sagaRepo.save(saga);

      try {
        await step.execute();
        executedSteps.push(step);
      } catch (error) {
        this.logger.log(`[SAGA] Order ${input.orderId} return Error.`);
        let verifyResult: IVerifySagaResult;
        if (error instanceof AmbiguousRpcException) {
          try {
            verifyResult = await this.verifyStepOutcome(
              step.name,
              input.orderId,
            );

            if (
              step.name === ESagaStep.RESERVE_INVENTORY.toString() &&
              verifyResult.reservationId
            ) {
              saga.reservationId = verifyResult.reservationId;
            }
          } catch (verifyError) {
            saga.lastError = `Verify failed: ${(verifyError as Error).message}`;
            saga.verifyRetryCount = (saga.verifyRetryCount ?? 0) + 1;
            await this.sagaRepo.save(saga);
            throw error; // break loop
          }

          // Compensate chỉ những step đã thực sự chạy
          if (verifyResult.happened) {
            executedSteps.push(step);
          }
        }

        saga.status = SagaStatus.COMPENSATING;
        saga.lastError = (error as Error).message;
        await this.sagaRepo.save(saga);

        // Rollback ngược lại tất cả bước đã thành công
        for (const done of [...executedSteps].reverse()) {
          try {
            await done.compensate();
          } catch (e) {
            saga.status = SagaStatus.FAILED;
            saga.lastError = `Compensation failed at step ${done.name}: ${(e as Error).message}`;
            this.logger.error(
              `[SAGA] Order ${input.orderId} compensation failed at step ${done.name}: ${(e as Error).message}`,
            );

            break;
          }
        }

        if (saga.status !== SagaStatus.FAILED) {
          saga.status = SagaStatus.COMPENSATED;
        }
        await this.sagaRepo.save(saga);

        throw error; // break loop
      }
    }

    const total = validatedItems.reduce((sum, i) => sum + i.subtotal, 0);

    saga.status = SagaStatus.COMPLETED;
    saga.currentStep = ESagaStep.COMPLETED;
    await this.sagaRepo.save(saga);

    return { validatedItems, total };
  }

  async verifyStepOutcome(
    step: string,
    orderId: string,
  ): Promise<IVerifySagaResult> {
    if (step === ESagaStep.RESERVE_INVENTORY.toString()) {
      const check = await this.inventoryBroker.getReservationStatus(orderId);
      return { happened: check.exists, reservationId: check.reservationId };
    }
    if (step === ESagaStep.CHARGE_PAYMENT.toString()) {
      const check = await this.paymentBroker.getPaymentStatus(orderId);
      return { happened: false, transactionId: check.transactionId };
    }
    return { happened: false }; // false = step chưa từng xảy ra, không cần compensate step này
  }

  async compensateFromState(saga: SagaState): Promise<void> {
    saga.status = SagaStatus.COMPENSATING;
    await this.sagaRepo.save(saga);

    try {
      // Compensate ngược thứ tự: payment trước (nếu đã chạy tới đó), rồi inventory
      if (
        saga.currentStep === ESagaStep.CHARGE_PAYMENT.toString() &&
        saga.transactionId
      ) {
        await this.paymentBroker.paymentRefund(saga.id);
      }
      if (saga.reservationId) {
        await this.inventoryBroker.release(saga.reservationId);
      }
      await this.redis.del(`saga:timeout:${saga.id}`);

      saga.status = SagaStatus.COMPENSATED;
      await this.sagaRepo.save(saga);
    } catch (err) {
      saga.status = SagaStatus.FAILED;
      saga.lastError = (err as Error).message;
      await this.sagaRepo.save(saga);
      throw err;
    }
  }
}
