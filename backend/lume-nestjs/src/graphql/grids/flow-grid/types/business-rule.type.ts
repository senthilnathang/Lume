import { ObjectType, Field, Int, JSON as GraphQLJSON } from '@nestjs/graphql';
import { Node } from '../../shared/interfaces/node.interface';
import { Auditable } from '../../shared/interfaces/auditable.interface';

@ObjectType('BusinessRule', { implements: [Node, Auditable] })
export class BusinessRuleType implements Node, Auditable {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;

  @Field()
  model: string;

  @Field()
  field: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  condition?: any;

  @Field(() => GraphQLJSON, { nullable: true })
  action?: any;

  @Field(() => Int)
  priority: number;

  @Field()
  status: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  deletedAt?: Date;
}
