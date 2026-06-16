import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { EOrderStatus } from '../enums/order-status.enum';
import { OrderItem } from '../entities/order-item.entity';
import { QueryOrderDto } from '../dto/query-order.dto';
import { IProductValidateResult } from '../interfaces/order-item.interface';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: {
    userId: string;
    total: number;
    items: {
      productId: string;
      productName: string;
      price: number;
      qty: number;
      subtotal: number;
    }[];
  }): Promise<Order> {
    const order = this.repo.create({
      userId: data.userId,
      totalAmount: data.total,
      status: EOrderStatus.PENDING,
      items: data.items.map(
        (item) =>
          ({
            ...item,
          }) as OrderItem,
      ),
    });
    return this.repo.save(order);
  }

  async findById(id: string): Promise<Order | null> {
    return this.repo.findOne({ where: { id }, relations: { items: true } });
  }

  async findByUserId(userId: string, query: QueryOrderDto) {
    const qb = this.repo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.userId = :userId', { userId });

    if (query.status)
      qb.andWhere('order.status = :status', { status: query.status });

    qb.orderBy('order.createdAt', 'DESC');

    if (query.page && query.limit) {
      qb.skip((query.page - 1) * query.limit);
    }

    const [orders, total] = await qb.take(query.limit).getManyAndCount();

    return { orders, total, page: query.page, limit: query.limit };
  }

  async updateStatus(
    id: string,
    status: EOrderStatus,
    failureReason?: string,
  ): Promise<void> {
    await this.repo.update(id, {
      status,
      ...(failureReason && { failureReason }),
    });
  }

  async updateOrderItems(
    orderId: string,
    validatedItems: IProductValidateResult[],
    total: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Update order total
      await manager.update(Order, { id: orderId }, { totalAmount: total });

      // Update order item
      for (const item of validatedItems) {
        await manager.update(
          OrderItem,
          { orderId, productId: item.productId },
          {
            productName: item.name,
            price: item.price,
            subtotal: item.subtotal,
          },
        );
      }
    });
  }
}
