import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePresetDto {
  @IsString()
  @IsNotEmpty()
  blockType!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  attributes?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsOptional()
  createdBy?: number;
}
