import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { EUserRole } from '../enums/user-role.enum';
import { IUser } from '../interfaces/user.interface';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto implements IUser {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @IsEnum(EUserRole)
  @IsOptional()
  role: EUserRole;

  id: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
