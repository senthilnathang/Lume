import { InputType, Field, JSON as GraphQLJSON } from '@nestjs/graphql';

@InputType('UpdateFlowInput')
export class UpdateFlowInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  nodes?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  edges?: any;

  @Field({ nullable: true })
  trigger?: string;

  @Field({ nullable: true })
  status?: string;
}
