import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Node } from '../../shared/interfaces/node.interface';
import { Auditable } from '../../shared/interfaces/auditable.interface';
import { PermissionType } from './permission.type';
import { FieldPermissionType } from './field-permission.type';

@ObjectType('Role', { implements: [Node, Auditable] })
export class RoleType implements Node, Auditable {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;

  @Field()
  displayName: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  isActive: boolean;

  @Field()
  isSystem: boolean;

  @Field({ nullable: true })
  metadata?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  deletedAt?: Date;

  @Field(() => [PermissionType])
  permissions: PermissionType[];

  @Field(() => [FieldPermissionType])
  fieldPermissions: FieldPermissionType[];
}
