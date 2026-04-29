import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateGlobalWidgetDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  blockType!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  createdBy?: number;
}
