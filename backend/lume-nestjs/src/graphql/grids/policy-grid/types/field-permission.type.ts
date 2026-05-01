import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Node } from '../../shared/interfaces/node.interface';
import { Auditable } from '../../shared/interfaces/auditable.interface';
import { RoleType } from './role.type';

@ObjectType('FieldPermission', { implements: [Node, Auditable] })
export class FieldPermissionType implements Node, Auditable {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  fieldId: number;

  @Field(() => Int)
  roleId: number;

  @Field()
  canRead: boolean;

  @Field()
  canWrite: boolean;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  updatedAt?: Date;

  @Field({ nullable: true })
  deletedAt?: Date;

  @Field(() => RoleType, { nullable: true })
  role?: RoleType;
}
