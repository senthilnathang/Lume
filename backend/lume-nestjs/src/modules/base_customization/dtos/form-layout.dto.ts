import { IsArray, IsNumber, IsString, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FormFieldLayoutDto {
  @IsString()
  fieldName: string;

  @IsNumber()
  @IsOptional()
  colspan?: number = 1;

  @IsBoolean()
  @IsOptional()
  hidden?: boolean;

  @IsBoolean()
  @IsOptional()
  readonly?: boolean;
}

export class FormRowLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldLayoutDto)
  fields: FormFieldLayoutDto[];
}

export class FormSectionLayoutDto {
  @IsString()
  id: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsNumber()
  @IsOptional()
  columns?: 1 | 2 | 3 | 4 = 1;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormRowLayoutDto)
  rows: FormRowLayoutDto[];
}

export class FormLayoutSchemaDto {
  @IsNumber()
  version: number = 1;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormSectionLayoutDto)
  sections: FormSectionLayoutDto[];
}

export class CreateFormLayoutDto {
  @IsNumber()
  entityId: number;

  @ValidateNested()
  @Type(() => FormLayoutSchemaDto)
  schema: FormLayoutSchemaDto;

  @IsString()
  @IsOptional()
  name?: string;
}

export class UpdateFormLayoutDto {
  @ValidateNested()
  @Type(() => FormLayoutSchemaDto)
  @IsOptional()
  schema?: FormLayoutSchemaDto;

  @IsString()
  @IsOptional()
  name?: string;
}
