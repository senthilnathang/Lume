import { IsNumber } from 'class-validator';

export class LinkRecordsDto {
  @IsNumber()
  relationshipId!: number;

  @IsNumber()
  targetRecordId!: number;
}
