import { IsString, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';

export class UpdateAccessRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  @IsOptional()
  roleId?: number;

  @IsString()
  @IsOptional()
  permission?: string;

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
