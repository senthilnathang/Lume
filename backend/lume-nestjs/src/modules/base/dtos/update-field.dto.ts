import { IsString, IsOptional, IsBoolean, IsArray, IsNumber } from 'class-validator';

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

  @IsOptional()
  @IsNumber()
  lookupEntityId?: number;

  @IsOptional()
  @IsString()
  lookupField?: string;

  @IsOptional()
  @IsString()
  formulaExpression?: string;

  @IsOptional()
  @IsBoolean()
  isStored?: boolean;
}
