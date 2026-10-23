import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { Node } from '../../../shared/interfaces/node.interface';

// Legacy rows have nullable timestamps, so they cannot implement Auditable's non-null contract.
@ObjectType('RecordRule', { implements: [Node] })
export class RecordRuleType implements Node {
  @Field(() => ID)
  id: number;

  @Field()
  name: string;

  @Field()
  modelName: string;

  @Field()
  action: string;

  @Field()
  domain: string;

  @Field({ nullable: true })
  groups?: string;

  @Field({ nullable: true })
  users?: string;

  @Field({ nullable: true })
  isActive: boolean;

  @Field(() => Int, { nullable: true })
  sequence: number;

  @Field({ nullable: true })
  createdAt: Date;

  @Field({ nullable: true })
  updatedAt: Date;

  @Field({ nullable: true })
  deletedAt?: Date;
}
