import { IsString, IsIn, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreateIpAccessDto {
  @IsString()
  @Matches(/^(\d{1,3}\.){3}\d{1,3}(\.\*)?$/, {
    message: 'Invalid IP address format. Use format like 192.168.1.1 or 192.168.1.*',
  })
  ipAddress!: string;

  @IsString()
  @IsIn(['whitelist', 'blacklist'])
  type!: 'whitelist' | 'blacklist';

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
