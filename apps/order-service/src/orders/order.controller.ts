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

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly ordersService: OrderService) {}

  @Post()
  placeOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.placeOrder(dto);
  }

  @Get()
  findMyOrders(@Req() req: any, @Query() query: QueryOrderDto) {
    return this.ordersService.findMyOrders(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/cancel')
  cancelOrder(@Req() req: any, @Param('id') id: string) {
    return this.ordersService.cancelOrder(id, req.user.id);
  }
}
