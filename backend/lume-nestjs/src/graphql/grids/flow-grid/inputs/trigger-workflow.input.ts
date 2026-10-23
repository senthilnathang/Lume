import { GraphQLJSON } from 'graphql-scalars';
import { InputType, Field, Int } from '@nestjs/graphql';

@InputType('TriggerWorkflowInput')
export class TriggerWorkflowInput {
  @Field(() => Int)
  workflowId: number;

  @Field(() => Int, { nullable: true })
  recordId?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  payload?: any;
}
