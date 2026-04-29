import { IsNotEmpty, IsOptional, IsString, IsDateString, IsInt, IsBoolean } from 'class-validator';

export class CreateActivityDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  gallery?: any[];

  @IsOptional()
  @IsInt()
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}
