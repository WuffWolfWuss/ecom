import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrokerService } from '@app/broker';
import { UserEventHandler } from './event-handlers/user.events';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  providers: [UsersService, UserEventHandler],
  controllers: [UsersController],
  exports: [UsersService], 
})
export class UsersModule {}
