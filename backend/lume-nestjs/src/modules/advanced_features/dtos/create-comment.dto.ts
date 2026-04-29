import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  body!: string;

  @IsString()
  commentableType!: string;

  @IsNumber()
  commentableId!: number;

  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsOptional()
  @IsNumber()
  userId?: number;
}
