import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IProduct } from '../interfaces/product.interface';

export class UpdateProductDto implements IProduct {
  categoryId: any;
  @IsOptional()
  createdBy: string;
  availableStock?: number;
  stockUpdatedAt?: Date;
  @ApiProperty()
  @IsString()
  @IsOptional()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsOptional()
  price: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPrice?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;
}
