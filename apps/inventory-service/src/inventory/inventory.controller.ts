import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { UpdateStockDto } from './dto/update-stock.dto';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':productId')
  getStock(@Param('productId') productId: string) {
    return this.inventoryService.getStock(productId);
  }

  @Post(':productId/add-stock')
  @ApiBearerAuth()
  addStock(@Param('productId') productId: string, @Body() dto: UpdateStockDto) {
    return this.inventoryService.addStock(productId, dto.quantity);
  }
}
