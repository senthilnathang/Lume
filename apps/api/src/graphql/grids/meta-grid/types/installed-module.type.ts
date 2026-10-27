import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Node } from '../../../shared/interfaces/index.js';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType('InstalledModule', { implements: [Node] })
export class InstalledModuleType implements Node {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  version: string;

  @Field(() => String)
  status: string; // 'loaded' | 'pending'

  @Field(() => String)
  managedBy: string;

  @Field(() => [String])
  actions: string[];

  @Field(() => [String], { nullable: true })
  depends?: string[];

  @Field(() => GraphQLJSON, { nullable: true })
  config?: Record<string, unknown>;

  @Field(() => Int, { nullable: true })
  configRevision?: number;

  @Field(() => Int, { nullable: true })
  appliedConfigRevision?: number;

  @Field(() => Boolean, { nullable: true })
  configPending?: boolean;

  @Field(() => Date, { nullable: true })
  installedAt?: Date;
}
