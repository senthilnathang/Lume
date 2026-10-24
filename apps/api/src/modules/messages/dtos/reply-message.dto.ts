import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ReplyMessageDto {
  @IsString()
  @IsNotEmpty()
  replyContent!: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
