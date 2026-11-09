import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  // No MinLength here: a length rule would leak the password policy and
  // reject before the attempt is counted.
  @ApiProperty()
  @IsString()
  @MaxLength(72)
  password: string;
}
