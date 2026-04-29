import { IsOptional, IsNumber, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDonationsDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  status?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  donorId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  campaignId?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}

export class QueryDonorsDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;
}
