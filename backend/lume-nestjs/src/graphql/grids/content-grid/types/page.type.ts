import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Node, Auditable } from '../../shared/interfaces/index.js';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType('Page', { implements: [Node, Auditable] })
export class PageType implements Node, Auditable {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  slug: string;

  @Field(() => GraphQLJSON, { nullable: true })
  content?: Record<string, unknown>;

  @Field(() => String)
  status: string; // 'draft' | 'published' | 'archived'

  @Field(() => Date, { nullable: true })
  publishAt?: Date;

  @Field(() => Date, { nullable: true })
  expireAt?: Date;

  @Field(() => String, { nullable: true })
  metaTitle?: string;

  @Field(() => String, { nullable: true })
  metaDescription?: string;

  @Field(() => String, { nullable: true })
  ogImage?: string;

  @Field(() => Int, { nullable: true })
  authorId?: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;
}
