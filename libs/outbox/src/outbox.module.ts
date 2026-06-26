import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from '@app/database';
import { ScheduleModule } from '@nestjs/schedule';
import { BrokerModule } from '@app/broker';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxEvent]),
    ScheduleModule.forRoot(),
    BrokerModule,
  ],
  providers: [OutboxService, OutboxDispatcherService],
  exports: [OutboxService],
})
export class OutboxModule {}
