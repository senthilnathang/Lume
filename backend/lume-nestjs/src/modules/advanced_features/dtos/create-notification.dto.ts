import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateNotificationDto {
  @IsNumber()
  userId!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  relatedModel?: string;

  @IsOptional()
  @IsNumber()
  relatedId?: number;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
