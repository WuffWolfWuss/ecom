import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'false disables the account and revokes all its sessions',
  })
  @IsBoolean()
  isActive: boolean;
}
