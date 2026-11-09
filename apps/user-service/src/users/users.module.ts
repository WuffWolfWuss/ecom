import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersHandler } from './messaging/handlers/users.handler';
import { UsersPublisher } from './messaging/publishers/users.publisher';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, UsersHandler, UsersPublisher],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
