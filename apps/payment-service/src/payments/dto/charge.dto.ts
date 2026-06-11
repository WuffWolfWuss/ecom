import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EPaymentMethod } from '../constants/enum';

export class ChargeDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ enum: EPaymentMethod })
  @IsEnum(EPaymentMethod)
  @IsOptional()
  method?: EPaymentMethod = EPaymentMethod.CREDIT_CARD;
}
