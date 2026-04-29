import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateAttachmentDto {
  @IsString()
  fileName!: string;

  @IsString()
  filePath!: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsString()
  attachableType!: string;

  @IsNumber()
  attachableId!: number;

  @IsOptional()
  @IsNumber()
  uploadedBy?: number;
}
