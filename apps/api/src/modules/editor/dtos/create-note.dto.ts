import { IsNumber, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateNoteDto {
  @IsNumber()
  @IsNotEmpty()
  pageId!: number;

  @IsString()
  @IsOptional()
  blockId?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsNumber()
  @IsNotEmpty()
  authorId!: number;

  @IsNumber()
  @IsOptional()
  parentId?: number;
}
