import { IsString, IsObject, IsOptional } from 'class-validator';

export class AddJobDto {
  @IsObject()
  data!: Record<string, any>;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}
