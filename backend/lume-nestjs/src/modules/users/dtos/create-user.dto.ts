import { IsEmail, IsString, MinLength, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsNumber()
  role_id?: number;
}
