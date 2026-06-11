import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EOrderStatus } from '../enums/order-status.enum';

export class QueryOrderDto {
  @ApiPropertyOptional({ enum: EOrderStatus })
  @IsString()
  @IsOptional()
  status?: EOrderStatus;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
