import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { BrokerService } from '@app/broker';
import { EOrderStatus } from './enums/order-status.enum';
import { OrdersRepository } from './repositories/orders.repository';
import { PlaceOrderSaga } from './saga/place-order.saga';
import { QueryOrderDto } from './dto/query-order.dto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly repo: OrdersRepository,
    private readonly saga: PlaceOrderSaga,
    private readonly broker: BrokerService,
  ) {}

  async placeOrder(dto: CreateOrderDto, userId?: string) {
    // Tạo order với status PENDING trước để có orderId cho saga
    const order = await this.repo.create({
      userId: dto.userId,
      total: 0, // chưa biết giá, saga sẽ validate
      items: dto.items.map((i) => ({
        productId: i.productId,
        productName: '', // saga sẽ điền vào
        price: 0,
        qty: i.qty,
        subtotal: 0,
      })),
    });
    this.repo;

    try {
      const { validatedItems, total } = await this.saga.execute({
        orderId: order.id,
        userId: dto.userId,
        items: dto.items,
      });

      // Saga thành công — update order với thông tin thật
      await this.repo.updateStatus(order.id, EOrderStatus.PAYMENT_COMPLETED);

      // Update items với giá thật từ product service
      const confirmed = await this.repo.findById(order.id);

      // Publish event để notification service gửi email xác nhận
      await this.broker.publish({
        topic: 'order.confirmed',
        payload: { orderId: order.id, userId, total, items: validatedItems },
      });

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
    if (userId && order.userId !== userId)
      throw new ForbiddenException('Access denied');
    return order;
  }

  async cancelOrder(id: string, userId: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (order.status !== EOrderStatus.PENDING) {
      throw new ForbiddenException('Only pending orders can be cancelled');
    }

    await this.repo.updateStatus(id, EOrderStatus.CANCELLED);

    // Release stock
    await this.broker.send({
      topic: 'inventory.release',
      payload: {
        items: order.items.map((i) => ({ productId: i.productId, qty: i.qty })),
      },
    });

    await this.broker.publish({
      topic: 'order.cancelled',
      payload: { orderId: id, userId },
    });

    return { success: true };
  }
}
