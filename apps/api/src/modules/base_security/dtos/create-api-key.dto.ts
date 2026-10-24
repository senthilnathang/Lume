import { IsString, IsArray, IsOptional, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @IsOptional()
  scopes?: string[];
}
