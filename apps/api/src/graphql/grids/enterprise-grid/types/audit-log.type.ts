import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { Node, Auditable } from '../../../shared/interfaces/index.js';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType('AuditLog', { implements: [Node] })
export class AuditLogType implements Node {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  entity?: string;

  @Field(() => String)
  action: string; // 'create' | 'update' | 'delete'

  @Field(() => String, { nullable: true })
  recordId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  changes?: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  userId?: string;

  @Field(() => String, { nullable: true })
  userEmail?: string;

  @Field(() => String, { nullable: true })
  userRole?: string;

  @Field(() => String, { nullable: true })
  ipAddress?: string;

  @Field(() => Int)
  changeCount: number;

  @Field(() => Date, { nullable: true })
  createdAt?: Date;
}
