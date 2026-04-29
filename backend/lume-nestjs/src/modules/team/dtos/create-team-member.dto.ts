import { IsNotEmpty, IsOptional, IsString, IsEmail, IsBoolean, IsInt } from 'class-validator';

export class CreateTeamMemberDto {
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsInt()
  order?: number = 0;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isLeader?: boolean = false;

  @IsOptional()
  socialLinks?: Record<string, string>;

  @IsOptional()
  metadata?: Record<string, any>;
}
