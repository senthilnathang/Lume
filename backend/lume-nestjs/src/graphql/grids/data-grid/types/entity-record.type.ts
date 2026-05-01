import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Node } from '../../../shared/interfaces/node.interface';
import { Auditable } from '../../../shared/interfaces/auditable.interface';
import { EntityType } from './entity.type';

@ObjectType('EntityRecord')
export class EntityRecordType implements Node, Auditable {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  entityId: number;

  @Field(() => EntityType, { nullable: true })
  entity?: EntityType;

  @Field(() => Object) // JSON scalar
  data: any;

  @Field(() => Int)
  createdBy: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;

  @Field(() => Int, { nullable: true })
  companyId?: number;

  @Field(() => String, { defaultValue: 'private' })
  visibility: string;
}
