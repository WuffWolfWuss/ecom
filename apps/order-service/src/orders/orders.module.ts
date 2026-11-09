import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PlaceOrderSaga } from './saga/place-order.saga';
import { OrderItem } from './entities/order-item.entity';
import { OrdersRepository } from './repositories/orders.repository';
import { SagaState } from './entities/saga-state.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@app/redis';
import { SagaReconciliationService } from './saga/saga-reconciliation.service';
import { SagaTimeoutListener } from './saga/saga-timeout.listener';
import {
  InventoryClient,
  PaymentClient,
  ProductClient,
} from './messaging/clients';
import { OrdersHandler } from './messaging/handlers/orders.handler';
import { OrdersPublisher } from './messaging/publishers/orders.publisher';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, SagaState]),
    ScheduleModule.forRoot(),
    RedisModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersHandler,
    PlaceOrderSaga,
    OrdersRepository,
    SagaReconciliationService,
    SagaTimeoutListener,
    InventoryClient,
    PaymentClient,
    ProductClient,
    OrdersPublisher,
  ],
})
export class OrdersModule {}
