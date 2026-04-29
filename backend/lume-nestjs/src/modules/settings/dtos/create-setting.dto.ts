import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateSettingDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsNotEmpty()
  value!: any;

  @IsString()
  @IsOptional()
  type?: 'string' | 'number' | 'boolean' | 'json' | 'array';

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_public?: boolean;

  @IsBoolean()
  @IsOptional()
  is_encrypted?: boolean;
}
