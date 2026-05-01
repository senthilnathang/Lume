import { ObjectType, Field, Int, JSON as GraphQLJSON } from '@nestjs/graphql';

@ObjectType('AgentQueryResult')
export class AgentQueryResultType {
  @Field()
  answer: string;

  @Field({ nullable: true })
  graphqlQuery?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  records?: any;

  @Field()
  confidence: number;

  @Field(() => Int)
  executionTimeMs: number;

  @Field({ nullable: true })
  errorMessage?: string;

  @Field({ nullable: true })
  suggestion?: string;
}
