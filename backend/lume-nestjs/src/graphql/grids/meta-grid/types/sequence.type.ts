import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Node, Auditable } from '../../shared/interfaces/index.js';

@ObjectType('Sequence', { implements: [Node, Auditable] })
export class SequenceType implements Node, Auditable {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  prefix?: string;

  @Field(() => Int)
  nextValue: number;

  @Field(() => Int)
  step: number;

  @Field(() => Int)
  padding: number;

  @Field(() => String)
  format: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;
}
