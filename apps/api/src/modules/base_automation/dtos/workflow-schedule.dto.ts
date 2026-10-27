import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateWorkflowScheduleDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsString() @IsNotEmpty() @MaxLength(100) workflowName: string;
  @IsInt() @Min(1) @Max(2147483647) recordId: number;
  @IsOptional() @IsString() @MaxLength(100) cronExpression?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(525600) intervalMinutes?: number | null;
  @IsOptional() @IsIn(['active', 'inactive']) status?: string;
}

export class UpdateWorkflowScheduleDto {
  @IsInt() @Min(0) @Max(2147483647) version: number;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(100) cronExpression?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(525600) intervalMinutes?: number | null;
  @IsOptional() @IsIn(['active', 'inactive']) status?: string;
}
