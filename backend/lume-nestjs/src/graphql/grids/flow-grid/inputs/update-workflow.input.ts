import { InputType, Field, JSON as GraphQLJSON } from '@nestjs/graphql';

@InputType('UpdateWorkflowInput')
export class UpdateWorkflowInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  states?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  transitions?: any;

  @Field({ nullable: true })
  initialState?: string;

  @Field({ nullable: true })
  status?: string;
}
