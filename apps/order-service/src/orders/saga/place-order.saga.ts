import { AmbiguousRpcException, BrokerService } from '@app/broker';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { IProductValidateResult } from '../interfaces/order-item.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { SagaState, SagaStatus } from '@app/database';
import { REDIS_CLIENT } from '@app/redis';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { ESagaStep } from '../enums/saga-steps.enum';
import { IVerifySagaResult } from '../interfaces/order.interface';
import { InventoryBrokerService } from '../handlers/inventory.broker';

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
    private readonly broker: BrokerService,
    @InjectRepository(SagaState)
    private readonly sagaRepo: Repository<SagaState>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async execute(
    input: InputOrder,
  ): Promise<{ validatedItems: IProductValidateResult[]; total: number }> {
    const executedSteps: SagaStep[] = [];
    let reservationId: string;
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
          validatedItems = await this.stepValidateProduct(input);
        },
        compensate: async () => {}, // không cần rollback, chỉ là đọc data
      },
      {
        name: ESagaStep.RESERVE_INVENTORY,
        // Bước 2: reserve stock từ Inventory service
        execute: async () => {
          reservationId = await this.stepItemReserve(input, validatedItems);
          saga.reservationId = reservationId;
          await this.sagaRepo.save(saga);

          // Set saga timeout
          await this.redis.set(
            `saga:timeout:${input.orderId}`,
            reservationId,
            'EX',
            RESERVATION_TTL_SECONDS,
          );
        },
        compensate: async () =>
          this.stepIntemReservceConpensate(input, reservationId),
      },
      {
        name: ESagaStep.CHARGE_PAYMENT,
        // Bước 3: charge tiền qua Payment service
        execute: async () => {
          const transactionId = await this.stepPayment(input, validatedItems);

          saga.transactionId = transactionId;
          await this.redis.del(`saga:timeout:${input.orderId}`);
        },
        compensate: async () =>
          this.stepPaymentConpensate(input, validatedItems),
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
          } catch (verifyError) {
            saga.lastError = `Verify failed: ${(verifyError as Error).message}`;
            saga.verifyRetryCount = (saga.verifyRetryCount ?? 0) + 1;
            await this.sagaRepo.save(saga);
            throw error; // break loop
          }
          if (verifyResult.happened) {
            executedSteps.push(step);
          }
        }

        saga.status = SagaStatus.COMPENSATING;
        saga.lastError = (error as Error).message;
        await this.sagaRepo.save(saga);

        // Rollback ngược lại tất cả bước đã thành công
        for (const done of [...executedSteps].reverse()) {
          await done
            .compensate()
            .catch((e) => console.error('Compensation failed:', e));
        }

        saga.status = SagaStatus.COMPENSATED;
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
      const check = await this.inventoryBroker.getReservationStatus<{
        exists: boolean;
        reservationId?: string;
      }>(orderId);
      return { happened: check.exists, reservationId: check.reservationId };
    }
    if (step === ESagaStep.CHARGE_PAYMENT.toString()) {
      // TODO: check status payment exist.
      return { happened: false, transactionId: '' };
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
        this.logger.log(`[Reconciliation] Order ${saga.id} refunding payment`);
        await this.broker.send({
          topic: 'payment.refund',
          payload: { orderId: saga.id },
        });
      }
      if (saga.reservationId) {
        this.logger.log(
          `[Reconciliation] Order ${saga.id} releasing reservation`,
        );
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

  private async stepValidateProduct(input: InputOrder) {
    this.logger.log(
      `[SAGA] Order ${input.orderId} validate product. Items: ${JSON.stringify(input.items.map((v) => v.productId))}`,
    );
    const validatedItems = await this.broker.send<IProductValidateResult[]>({
      topic: 'product.validate',
      payload: { items: input.items },
    });
    this.logger.log(
      `[SAGA] Validate product return result: ${JSON.stringify(validatedItems)}`,
    );

    return validatedItems;
  }

  private async stepItemReserve(
    input: InputOrder,
    validatedItems: IProductValidateResult[],
  ): Promise<string> {
    const result = await this.inventoryBroker.reservation<{
      success: boolean;
      reservationId: string;
      reason?: string;
    }>(input.orderId, validatedItems);

    return result.reservationId;
  }

  private async stepPayment(
    input: InputOrder,
    validatedItems: IProductValidateResult[],
  ): Promise<string> {
    this.logger.log(`[SAGA] Order ${input.orderId} payment charge`);
    const total = validatedItems.reduce((sum, i) => sum + i.subtotal, 0);
    const result = await this.broker.send<{
      success: boolean;
      transactionId: string;
    }>({
      topic: 'payment.charge',
      payload: {
        orderId: input.orderId,
        userId: input.userId,
        amount: total,
      },
    });
    this.logger.log(`[SAGA] Order return with data: ${JSON.stringify(result)}`);

    return result.transactionId;
  }

  private async stepPaymentConpensate(
    input: InputOrder,
    validatedItems: IProductValidateResult[],
  ) {
    this.logger.log(
      `[SAGA] Order ${input.orderId} Failed. stepPaymentConpensate...`,
    );
    await this.broker.send({
      topic: 'inventory.release',
      payload: {
        items: validatedItems.map((i) => ({
          productId: i.productId,
          qty: i.qty,
        })),
      },
    });
  }

  private async stepIntemReservceConpensate(
    input: InputOrder,
    reservationId: string,
  ) {
    this.logger.log(
      `[SAGA] Order ${input.orderId} Failed. stepIntemReservceConpensate...`,
    );
    await this.broker.send({
      topic: 'inventory.release',
      payload: { reservationId },
    });
  }
}
