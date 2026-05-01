import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Node } from '../../shared/interfaces/node.interface';
import { Auditable } from '../../shared/interfaces/auditable.interface';

@ObjectType('RecordRule', { implements: [Node, Auditable] })
export class RecordRuleType implements Node, Auditable {
  @Field(() => Int)
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

  @Field()
  isActive: boolean;

  @Field(() => Int)
  sequence: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  deletedAt?: Date;
}
