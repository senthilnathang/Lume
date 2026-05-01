import { ObjectType, Field } from '@nestjs/graphql';
import { Node, Auditable } from '../../shared/interfaces/index.js';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType('Tenant', { implements: [Node, Auditable] })
export class TenantType implements Node, Auditable {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  domain: string;

  @Field(() => GraphQLJSON, { nullable: true })
  config?: Record<string, unknown>;

  @Field(() => Boolean)
  active: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;
}
