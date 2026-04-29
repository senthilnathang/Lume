import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsIn,
  IsNumber,
} from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsEmail()
  @IsNotEmpty()
  senderEmail!: string;

  @IsString()
  @IsOptional()
  senderPhone?: string;

  @IsEmail()
  @IsOptional()
  recipientEmail?: string;

  @IsString()
  @IsOptional()
  @IsIn(['contact', 'inquiry', 'support', 'feedback', 'other'])
  type?: string;

  @IsString()
  @IsOptional()
  @IsIn(['new', 'read', 'replied', 'archived'])
  status?: string;

  @IsString()
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @IsNumber()
  @IsOptional()
  assignedTo?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}
