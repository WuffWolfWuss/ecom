import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { BrokerService } from '@app/broker';
import { EOrderStatus } from './enums/order-status.enum';
import { BrokerEvent, BrokerMessage } from '@app/broker';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly brokerService: BrokerService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const order = this.orderRepository.create({
      userId: createOrderDto.userId,
      items: createOrderDto.items,
      totalAmount: createOrderDto.totalAmount,
      status: EOrderStatus.PENDING,
    });

    await this.orderRepository.save(order);
    this.logger.log(`Order ${order.id} created with status PENDING`);

    // Start the Saga Orchestration (async to not block API response)
    this.runSagaOrchestrator(order.id).catch((err) =>
      this.logger.error(
        `Initial saga trigger failed for Order ${order.id}: ${err.message}`,
      ),
    );

    return order;
  }

  private async runSagaOrchestrator(orderId: string) {
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) return;

    try {
      this.logger.log(`Starting Saga for Order ${orderId}: Reserving Stock...`);
      await this.orderRepository.update(orderId, {
        status: EOrderStatus.STOCK_RESERVING,
      });

      // Step 1: Reserve Stock via NATS (Request-Reply)
      const reservationResponse = await this.brokerService.send<{
        reservationId: string;
      }>({
        topic: 'inventory.reserve',
        payload: {
          orderId: order.id,
          items: order.items,
        },
      });

      if (reservationResponse && reservationResponse.reservationId) {
        this.logger.log(
          `Stock reserved for Order ${orderId}. Reservation ID: ${reservationResponse.reservationId}`,
        );

        // Step 2: Transition to Payment Processing
        await this.orderRepository.update(orderId, {
          status: EOrderStatus.PAYMENT_PROCESSING,
        });

        // Trigger payment service
        await this.brokerService.publish({
          topic: 'payment.process',
          payload: { orderId: order.id, amount: order.totalAmount },
        });
      } else {
        throw new Error('Failed to reserve stock: No reservation ID returned');
      }
    } catch (error: any) {
      this.logger.error(`Saga failed for Order ${orderId}: ${error.message}`);
      await this.handleSagaFailure(orderId, error);
    }
  }

  @BrokerEvent('payment.succeeded')
  async handlePaymentSuccess(payload: { orderId: string }) {
    const { orderId } = payload;
    this.logger.log(`Received payment.succeeded for Order ${orderId}`);

    try {
      const order = await this.orderRepository.findOneBy({ id: orderId });
      if (!order || order.status !== EOrderStatus.PAYMENT_PROCESSING) return;

      // Step 3: Confirm Reservation in Inventory via NATS
      await this.brokerService.send({
        topic: 'inventory.confirm',
        payload: { orderId: order.id },
      });

      await this.orderRepository.update(orderId, {
        status: EOrderStatus.COMPLETED,
      });
      this.logger.log(`Order ${orderId} completed successfully.`);
    } catch (error: any) {
      this.logger.error(
        `Error during payment success handling for Order ${orderId}: ${error.message}`,
      );
      await this.handleSagaFailure(orderId, error);
    }
  }

  @BrokerEvent('payment.failed')
  async handlePaymentFailure(payload: { orderId: string; reason?: string }) {
    const { orderId, reason } = payload;
    this.logger.warn(
      `Received payment.failed for Order ${orderId}. Reason: ${reason}`,
    );

    try {
      await this.handleSagaFailure(
        orderId,
        new Error(reason || 'Payment failed'),
      );
    } catch (error: any) {
      this.logger.error(
        `Error during payment failure handling for Order ${orderId}: ${error.message}`,
      );
    }
  }

  private async handleSagaFailure(orderId: string, error: any) {
    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) return;

    if (
      order.status === EOrderStatus.PAYMENT_COMPLETED ||
      order.status === EOrderStatus.STOCK_RESERVING ||
      order.status === EOrderStatus.PAYMENT_PROCESSING
    ) {
      this.logger.warn(
        `Compensating transaction: Releasing stock for Order ${orderId}`,
      );
      await this.brokerService.send({
        topic: 'inventory.release',
        payload: { orderId: order.id },
      });
    }

    // If payment was completed, we might also need to refund (if that state exists)
    if (order.status === EOrderStatus.PAYMENT_COMPLETED) {
      this.logger.warn(
        `Compensating transaction: Refunding payment for Order ${orderId}`,
      );
      await this.brokerService.send({
        topic: 'payment.refund',
        payload: { orderId: order.id, paymentId: order.paymentId },
      });
    }

    await this.orderRepository.update(orderId, { status: EOrderStatus.FAILED });

    await this.brokerService.publish({
      topic: 'order.failed',
      payload: {
        orderId: order.id,
        reason: error?.message || 'Unknown failure',
      },
    });
  }
}
