import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrderService } from './order.service';
import { CurrentUser } from '@app/common';
import { Roles } from '@app/common/decorators/roles.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly ordersService: OrderService) {}

  @Post()
  @Roles('ADMIN', 'CUSTOMER')
  placeOrder(@CurrentUser() userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.placeOrder({ ...dto, userId });
  }

  @Get()
  findMyOrders(@CurrentUser() userId: string, @Query() query: QueryOrderDto) {
    return this.ordersService.findMyOrders(userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    console.log('userId: ', userId);
    return this.ordersService.findOne(id);
  }

  @Patch(':id/cancel')
  cancelOrder(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.ordersService.cancelOrder(id, userId);
  }
}
