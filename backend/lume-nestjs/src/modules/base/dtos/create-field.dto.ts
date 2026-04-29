import { IsString, IsOptional, IsBoolean, IsArray, MinLength } from 'class-validator';

export class CreateFieldDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  selectOptions?: any[];

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  @IsString()
  defaultValue?: string;
}
