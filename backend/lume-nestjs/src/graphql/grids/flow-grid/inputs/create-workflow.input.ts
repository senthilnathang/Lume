import { InputType, Field, JSON as GraphQLJSON } from '@nestjs/graphql';

@InputType('CreateWorkflowInput')
export class CreateWorkflowInput {
  @Field()
  name: string;

  @Field()
  model: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  states?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  transitions?: any;

  @Field({ nullable: true })
  initialState?: string;

  @Field({ nullable: true, defaultValue: 'draft' })
  status?: string;
}
