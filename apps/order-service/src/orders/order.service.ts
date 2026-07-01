import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { EOrderStatus } from './enums/order-status.enum';
import { OrdersRepository } from './repositories/orders.repository';
import { PlaceOrderSaga } from './saga/place-order.saga';
import { QueryOrderDto } from './dto/query-order.dto';
import { InventoryBrokerService, OrderBrokerService } from './handlers';
import { SagaState } from '@app/database';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly repo: OrdersRepository,
    private readonly saga: PlaceOrderSaga,
    private readonly orderBroker: OrderBrokerService,
    private readonly inventoryBroker: InventoryBrokerService,
    @InjectRepository(SagaState)
    private readonly sagaRepo: Repository<SagaState>,
  ) {}

  async createOrder(dto: CreateOrderDto, userId: string) {
    const order = await this.repo.create({
      userId: userId,
      total: 0,
      items: dto.items.map((i) => ({
        productId: i.productId,
        productName: '',
        price: 0,
        qty: i.qty,
        subtotal: 0,
      })),
    });

    return { orderId: order.id, status: order.status };
  }

  async placeOrder(orderId: string, userId: string) {
    const order = await this.repo.findById(orderId, userId);
    if (!order) throw new NotFoundException('Order not found');

    const result = await this.repo.updateStatusAtomic(
      { id: orderId, userId, status: EOrderStatus.PENDING },
      { status: EOrderStatus.PROCESSING },
    );

    if (!result) {
      throw new BadRequestException(
        `Order cannot be placed. May have been cancelled or already processing.`,
      );
    }

    try {
      const { validatedItems, total } = await this.saga.execute({
        orderId: order.id,
        userId,
        items: order.items,
      });

      // Saga thành công — update order với thông tin thật
      await this.repo.updateOrderItems(order.id, validatedItems, total);
      await this.repo.updateStatus(order.id, EOrderStatus.PAYMENT_COMPLETED);

      // Update items với giá thật từ product service
      const confirmed = await this.repo.findById(order.id);

      // Publish event để notification service gửi email xác nhận
      await this.orderBroker.eventOrderConfirmed(
        order.id,
        userId,
        total,
        validatedItems,
      );

      return confirmed;
    } catch (error) {
      // Saga thất bại — rollback đã được xử lý bên trong saga
      await this.repo.updateStatus(
        order.id,
        EOrderStatus.FAILED,
        error.message,
      );
      throw error;
    }
  }

  async findMyOrders(userId: string, query: QueryOrderDto) {
    return this.repo.findByUserId(userId, query);
  }

  async findOne(id: string, userId?: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    return order;
  }

  async cancelOrder(id: string, userId: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (order.status !== EOrderStatus.PENDING) {
      throw new ForbiddenException('Only pending orders can be cancelled');
    }

    await this.repo.updateStatusAtomic(
      { id, userId, status: EOrderStatus.PENDING },
      { status: EOrderStatus.CANCELLED },
    );

    const sagaState = await this.sagaRepo.findOne({ where: { id } });
    if (sagaState?.reservationId) {
      await this.inventoryBroker.release(sagaState.reservationId);
    }

    await this.orderBroker.eventOrderCancel(id, userId);

    return { success: true };
  }
}
