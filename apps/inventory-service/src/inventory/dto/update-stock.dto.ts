import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty({ description: 'Số lượng nhập thêm vào kho' })
  @IsNumber()
  @Min(1)
  quantity: number;
}
