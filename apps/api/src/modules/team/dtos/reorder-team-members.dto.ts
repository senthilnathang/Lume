import { IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MemberOrder {
  @IsNotEmpty()
  id!: number;

  @IsNotEmpty()
  order!: number;
}

export class ReorderTeamMembersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberOrder)
  members: MemberOrder[];
}
