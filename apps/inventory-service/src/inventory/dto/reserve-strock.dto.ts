import {
  IsArray,
  IsString,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReserveItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  qty: number;
}

export class ReserveStockDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty({ type: [ReserveItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReserveItemDto)
  items: ReserveItemDto[];
}
