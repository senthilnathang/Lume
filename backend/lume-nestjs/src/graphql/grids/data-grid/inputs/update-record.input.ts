import { GraphQLJSON } from 'graphql-scalars';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateRecordInput {
  @Field(() => GraphQLJSON) // JSON
  data: any;

  @Field(() => String, { nullable: true })
  visibility?: string;
}
