import { IsInt, Min } from 'class-validator';

export class LinkRecordsDto {
  @IsInt()
  @Min(1)
  relationshipId!: number;

  @IsInt()
  @Min(1)
  targetRecordId!: number;
}
