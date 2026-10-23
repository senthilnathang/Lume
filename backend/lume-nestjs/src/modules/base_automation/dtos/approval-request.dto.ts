import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateApprovalRequestDto {
  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER)
  chainId: number;

  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER)
  recordEntityId: number;

  @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER)
  recordId: number;
}

export class ApproveRequestDto {
  @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER)
  stepIndex: number;
}

export class RejectApprovalRequestDto extends ApproveRequestDto {
  @IsString() @MinLength(1) @MaxLength(2000)
  reason: string;
}
