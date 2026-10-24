import { ObjectType, Field, ID } from '@nestjs/graphql';
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
  status: string; // 'installed' | 'disabled' | 'error'

  @Field(() => [String], { nullable: true })
  depends?: string[];

  @Field(() => GraphQLJSON, { nullable: true })
  config?: Record<string, unknown>;

  @Field(() => Date)
  installedAt: Date;
}
