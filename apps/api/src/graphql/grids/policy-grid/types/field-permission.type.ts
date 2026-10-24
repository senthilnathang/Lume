import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { Node } from '../../../shared/interfaces/node.interface';
import { Auditable } from '../../../shared/interfaces/auditable.interface';
import { RoleType } from './role.type';

// Keep emitted decorator metadata lazy across the Role/FieldPermission cycle.
type RoleReference = RoleType;

@ObjectType('FieldPermission', { implements: [Node, Auditable] })
export class FieldPermissionType implements Node, Auditable {
  @Field(() => ID)
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
  isMasked: boolean;

  @Field()
  maskChar: string;

  @Field()
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field({ nullable: true })
  deletedAt?: Date;

  @Field(() => RoleType, { nullable: true })
  role?: RoleReference;
}
