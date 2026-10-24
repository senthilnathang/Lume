import { IsNotEmpty, IsOptional, IsString, IsInt, IsBoolean, IsIn } from 'class-validator';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  filename!: string;

  @IsNotEmpty()
  @IsString()
  path!: string;

  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  size?: number;

  @IsOptional()
  @IsIn(['image', 'video', 'document', 'audio', 'other'])
  type?: string = 'document';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @IsOptional()
  metadata?: Record<string, any>;
}
