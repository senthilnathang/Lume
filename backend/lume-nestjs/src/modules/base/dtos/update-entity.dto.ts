import { IsString, IsOptional } from 'class-validator';

export class UpdateEntityDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
