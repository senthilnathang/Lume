import { InputType, Field, JSON as GraphQLJSON } from '@nestjs/graphql';

@InputType('CreateFlowInput')
export class CreateFlowInput {
  @Field()
  name: string;

  @Field()
  model: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  nodes?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  edges?: any;

  @Field({ nullable: true, defaultValue: 'manual' })
  trigger?: string;

  @Field({ nullable: true, defaultValue: 'draft' })
  status?: string;
}
