import { IsString, MinLength } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @MinLength(6)
  token!: string;
}
