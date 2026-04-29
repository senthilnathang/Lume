import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';

export class CreateAccessRuleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsNumber()
  @IsNotEmpty()
  roleId!: number;

  @IsString()
  @IsNotEmpty()
  permission!: string;

  @IsString()
  @IsOptional()
  field?: string;

  @IsObject()
  @IsOptional()
  filter?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;
}
