import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreatePlatformConfigDto {
  @IsString()
  key!: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsString()
  description?: string;
}
