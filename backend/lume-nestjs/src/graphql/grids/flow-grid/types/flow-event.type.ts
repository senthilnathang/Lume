import { ObjectType, Field, Int, JSON as GraphQLJSON } from '@nestjs/graphql';

@ObjectType('FlowEvent')
export class FlowEventType {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  flowId: number;

  @Field()
  flowName: string;

  @Field()
  model: string;

  @Field()
  status: string;

  @Field(() => Int, { nullable: true })
  recordId?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  payload?: any;

  @Field()
  timestamp: Date;

  @Field(() => Int, { nullable: true })
  executionTimeMs?: number;

  @Field({ nullable: true })
  errorMessage?: string;

  @Field(() => Int, { nullable: true })
  companyId?: number;
}
