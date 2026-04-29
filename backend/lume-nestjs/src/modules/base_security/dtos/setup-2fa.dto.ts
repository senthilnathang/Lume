import { IsString, MinLength } from 'class-validator';

export class Setup2faDto {
  @IsString()
  @MinLength(6)
  token!: string;
}
