import { IsString, IsOptional, IsBoolean, IsArray, MinLength, IsEnum, IsNumber } from 'class-validator';
import { EntityFieldType } from '../constants/field-types.enum';

export class CreateFieldDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsEnum(EntityFieldType)
  type!: EntityFieldType;

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
