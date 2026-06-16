import { BrokerService } from '@app/broker';
import { Injectable, Logger } from '@nestjs/common';
import { IProductValidateResult } from '../interfaces/order-item.interface';

interface SagaStep {
  execute: () => Promise<any>;
  compensate: () => Promise<void>;
}

@Injectable()
export class PlaceOrderSaga {
  private readonly logger = new Logger(PlaceOrderSaga.name);
  constructor(private readonly broker: BrokerService) {}

  async execute(input: {
    orderId: string;
    userId: string;
    items: { productId: string; qty: number }[];
  }): Promise<{ validatedItems: IProductValidateResult[]; total: number }> {
    let validatedItems: IProductValidateResult[] = [];
    const executedSteps: SagaStep[] = [];

    const steps: SagaStep[] = [
      {
        // Bước 1: validate product + lấy giá từ Product service
        execute: async () => {
          this.logger.log(
            `[SAGA] Order ${input.orderId} validate product. Items: ${JSON.stringify(input.items.map((v) => v.productId))}`,
          );
          validatedItems = await this.broker.send<IProductValidateResult[]>({
            topic: 'product.validate',
            payload: { items: input.items },
          });
          this.logger.log(
            `[SAGA] Validate product return result: ${JSON.stringify(validatedItems)}`,
          );
        },
        compensate: async () => {}, // không cần rollback, chỉ là đọc data
      },
      {
        // Bước 2: reserve stock từ Inventory service
        execute: async () => {
          this.logger.log(`[SAGA] Order ${input.orderId} inventory reserve`);
          const result = await this.broker.send<{ success: boolean }>({
            topic: 'inventory.reserve',
            payload: {
              items: validatedItems.map((i) => ({
                productId: i.productId,
                qty: i.qty,
              })),
            },
          });
          if (!result.success) throw new Error('Failed to reserve stock');
        },
        compensate: async () => {
          this.logger.log(
            `[SAGA] Order ${input.orderId} inventory reserve failed. Releasing...`,
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
        },
      },
      {
        // Bước 3: charge tiền qua Payment service
        execute: async () => {
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
          if (!result.success) throw new Error('Payment failed');
        },
        compensate: async () => {
          this.logger.log(
            `[SAGA] Order ${input.orderId} payment failed. Process refund.`,
          );
          await this.broker.send({
            topic: 'payment.refund',
            payload: { orderId: input.orderId },
          });
        },
      },
    ];

    // Chạy từng bước
    for (const step of steps) {
      try {
        await step.execute();
        executedSteps.push(step);
      } catch (error) {
        // Rollback ngược lại tất cả bước đã thành công
        for (const done of [...executedSteps].reverse()) {
          await done
            .compensate()
            .catch((e) => console.error('Compensation failed:', e));
        }
        throw error;
      }
    }

    const total = validatedItems.reduce((sum, i) => sum + i.subtotal, 0);
    return { validatedItems, total };
  }
}
