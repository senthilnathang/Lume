import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export class UpdateIpAccessDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
