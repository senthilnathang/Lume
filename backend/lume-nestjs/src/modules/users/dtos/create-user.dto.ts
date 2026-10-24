import { IsEmail, IsString, MinLength, IsOptional, IsInt, Min, IsNotEmpty, IsBoolean, MaxLength } from 'class-validator';

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
  @IsInt()
  @Min(1)
  role_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
