import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';

export class MenuInput {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @IsString() @Matches(/^\/(?!\/)/) @MaxLength(500) path!: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(100) icon?: string;
  @IsOptional() @IsString() @MaxLength(100) module?: string;
  @IsOptional() @IsString() @MaxLength(200) permission?: string;
  @IsOptional() @IsString() @MaxLength(100) viewName?: string;
  @IsOptional() @IsInt() @Min(1) parentId?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) sequence?: number;
  @IsOptional() @IsBoolean() hideInMenu?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateMenuInput extends PartialType(MenuInput) {}

export class SequenceInput {
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @IsString() @Matches(/^[a-zA-Z0-9_.-]+$/) @MaxLength(50) code!: string;
  @IsOptional() @IsString() @MaxLength(20) prefix?: string;
  @IsOptional() @IsString() @MaxLength(20) suffix?: string;
  @IsOptional() @IsInt() @Min(0) @Max(20) padding?: number;
  @IsOptional() @IsInt() @Min(1) @Max(2147483647) nextNumber?: number;
  @IsOptional() @IsInt() @Min(1) @Max(2147483647) increment?: number;
  @IsOptional() @IsString() @MaxLength(100) modelName?: string;
  @IsOptional() @IsString() @MaxLength(100) fieldName?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSequenceSettingsInput extends PartialType(SequenceInput) {}

export class RecordRuleInput {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) modelName!: string;
  @IsIn(['create', 'read', 'write', 'unlink']) action!: string;
  @IsString() @MaxLength(100000) domain!: string;
  @IsOptional() @IsString() @MaxLength(100000) groups?: string;
  @IsOptional() @IsString() @MaxLength(100000) users?: string;
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) sequence?: number;
}
export class UpdateRecordRuleInput extends PartialType(OmitType(RecordRuleInput, ['modelName'] as const)) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}
