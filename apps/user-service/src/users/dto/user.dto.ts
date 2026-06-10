import { IsEmail, IsString, MinLength } from 'class-validator';
import { IUser } from '../interfaces/user';

export class CreateUserDto implements IUser {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  id: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}