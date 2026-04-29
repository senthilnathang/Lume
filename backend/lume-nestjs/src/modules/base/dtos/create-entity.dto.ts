import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateEntityDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
