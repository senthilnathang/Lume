import { ObjectType, Field, Int, Directive } from '@nestjs/graphql';
import { Node } from '../../../shared/interfaces/node.interface';
import { Auditable } from '../../../shared/interfaces/auditable.interface';
import { EntityFieldType } from './entity-field.type';

@ObjectType('Entity')
@Directive('@key(fields: "id")')
export class EntityType implements Node, Auditable {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  label: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int, { nullable: true })
  moduleId?: number;

  @Field(() => Int)
  createdBy: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;

  // Relations
  @Field(() => [EntityFieldType])
  fields: EntityFieldType[];
}
