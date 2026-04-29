import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  IsDecimal,
} from 'class-validator';

export class CreateDonationDto {
  @IsNumber()
  @IsNotEmpty()
  donorId!: number;

  @IsDecimal({ decimal_digits: '2' })
  @IsNotEmpty()
  amount!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  @IsIn(['pending', 'completed', 'failed', 'refunded'])
  status?: string;

  @IsString()
  @IsOptional()
  @IsIn(['cash', 'cheque', 'bank_transfer', 'online', 'other'])
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  paymentGateway?: string;

  @IsNumber()
  @IsOptional()
  campaignId?: number;

  @IsNumber()
  @IsOptional()
  activityId?: number;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  frequency?: string;

  @IsBoolean()
  @IsOptional()
  receiptSent?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  anonymous?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}
