import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderEventHandler } from './handlers/order-event.handler';
import { PlaceOrderSaga } from './saga/place-order.saga';
import { OrderItem } from './entities/order-item.entity';
import { OrdersRepository } from './repositories/orders.repository';
import { SagaState } from '@app/database';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@app/redis';
import { SagaReconciliationService } from './saga/saga-reconciliation.service';
import { SagaTimeoutListener } from './saga/saga-timeout.listener';
import { InventoryBrokerService } from './handlers/inventory.broker';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, SagaState]),
    ScheduleModule.forRoot(),
    RedisModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderEventHandler,
    PlaceOrderSaga,
    OrdersRepository,
    SagaReconciliationService,
    SagaTimeoutListener,
    InventoryBrokerService,
  ],
})
export class OrderModule {}
