import { ObjectType, Field, Int, JSON as GraphQLJSON } from '@nestjs/graphql';
import { Node } from '../../shared/interfaces/node.interface';
import { Auditable } from '../../shared/interfaces/auditable.interface';

@ObjectType('Workflow', { implements: [Node, Auditable] })
export class WorkflowType implements Node, Auditable {
  @Field(() => Int)
  id: number;

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

  @Field()
  status: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  deletedAt?: Date;
}
