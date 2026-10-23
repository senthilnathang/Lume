import { GraphQLJSON } from 'graphql-scalars';
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateRecordInput {
  @Field(() => GraphQLJSON) // JSON
  data: any;

  @Field(() => String, { nullable: true, defaultValue: 'private' })
  visibility?: string;
}
