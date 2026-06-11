import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // User xem lịch sử thanh toán của mình
  @Get()
  getMyPayments(@Req() req: any) {
    return this.paymentsService.getMyPayments(req.user.id);
  }

  // Xem chi tiết payment theo orderId
  @Get('order/:orderId')
  getByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrder(orderId);
  }
}
