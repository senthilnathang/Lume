import { IsString, IsObject, IsOptional } from 'class-validator';

export class AddRecurringJobDto {
  @IsString()
  jobName!: string;

  @IsObject()
  data!: Record<string, any>;

  @IsString()
  pattern!: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}
