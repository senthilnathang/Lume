import { IsString, MinLength } from 'class-validator';

export class RegenerateBackupCodesDto {
  @IsString()
  @MinLength(6)
  token!: string;
}
