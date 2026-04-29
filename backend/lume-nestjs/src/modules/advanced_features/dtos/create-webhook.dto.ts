import { IsString, IsUrl, IsOptional, IsArray, IsObject } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  name!: string;

  @IsUrl()
  url!: string;

  @IsOptional()
  @IsArray()
  events?: string[];

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  status?: string;
}
