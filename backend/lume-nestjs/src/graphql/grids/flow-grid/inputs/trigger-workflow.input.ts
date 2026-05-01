import { InputType, Field, Int, JSON as GraphQLJSON } from '@nestjs/graphql';

@InputType('TriggerWorkflowInput')
export class TriggerWorkflowInput {
  @Field(() => Int)
  workflowId: number;

  @Field(() => Int, { nullable: true })
  recordId?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  payload?: any;
}
