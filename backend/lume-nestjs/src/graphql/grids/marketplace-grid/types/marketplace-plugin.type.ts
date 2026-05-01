import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { Node, Auditable } from '../../shared/interfaces/index.js';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType('MarketplacePlugin', { implements: [Node, Auditable] })
export class MarketplacePluginType implements Node, Auditable {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  displayName: string;

  @Field(() => String)
  version: string;

  @Field(() => String)
  author: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  icon?: string;

  @Field(() => String)
  category: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [String], { nullable: true })
  screenshots?: string[];

  @Field(() => String)
  pricing: string; // 'free' | 'premium'

  @Field(() => Int)
  downloadCount: number;

  @Field(() => Float)
  rating: number;

  @Field(() => Int)
  reviewCount: number;

  @Field(() => String)
  status: string; // 'pending' | 'active' | 'rejected'

  @Field(() => Date, { nullable: true })
  publishedAt?: Date;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
