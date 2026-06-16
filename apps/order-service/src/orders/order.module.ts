import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderEventHandler } from './handlers/order-event.handler';
import { PlaceOrderSaga } from './saga/place-order.saga';
import { OrderItem } from './entities/order-item.entity';
import { OrdersRepository } from './repositories/orders.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderEventHandler,
    PlaceOrderSaga,
    OrdersRepository,
  ],
})
export class OrderModule {}
