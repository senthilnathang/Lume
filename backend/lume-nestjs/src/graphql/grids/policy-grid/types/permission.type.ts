import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Node } from '../../shared/interfaces/node.interface';
import { Auditable } from '../../shared/interfaces/auditable.interface';

@ObjectType('Permission', { implements: [Node, Auditable] })
export class PermissionType implements Node, Auditable {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;

  @Field()
  displayName: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  category: string;

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  deletedAt?: Date;
}
