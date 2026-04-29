import { IsString, IsNotEmpty, IsOptional, IsDecimal, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDecimal({ decimal_digits: '2' })
  @IsOptional()
  goalAmount?: number;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}
