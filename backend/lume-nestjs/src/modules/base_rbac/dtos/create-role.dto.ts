import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  permissionIds?: number[];

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
