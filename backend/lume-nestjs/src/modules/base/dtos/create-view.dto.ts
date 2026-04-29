import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateViewDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
