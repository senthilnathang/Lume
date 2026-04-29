import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CleanupAuditLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number = 90;
}
