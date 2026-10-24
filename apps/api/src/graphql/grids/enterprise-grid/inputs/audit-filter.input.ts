import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class AuditFilterInput {
  @Field(() => String, { nullable: true })
  entity?: string;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => String, { nullable: true })
  action?: string; // 'create' | 'update' | 'delete'

  @Field(() => Date, { nullable: true })
  fromDate?: Date;

  @Field(() => Date, { nullable: true })
  toDate?: Date;
}
