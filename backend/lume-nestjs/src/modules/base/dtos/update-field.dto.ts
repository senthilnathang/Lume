import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class UpdateFieldDto {
  @IsOptional()
  @IsString()
  label?: string;

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
