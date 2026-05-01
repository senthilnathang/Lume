import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Node, Auditable } from '../../shared/interfaces/index.js';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType('AuditLog', { implements: [Node] })
export class AuditLogType implements Node {
  @Field(() => String)
  id: string;

  @Field(() => String)
  entity: string;

  @Field(() => String)
  action: string; // 'create' | 'update' | 'delete'

  @Field(() => Int, { nullable: true })
  recordId?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  changes?: Record<string, unknown>;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  userEmail: string;

  @Field(() => String)
  userRole: string;

  @Field(() => String)
  ipAddress: string;

  @Field(() => Int)
  changeCount: number;

  @Field(() => Date)
  createdAt: Date;
}
