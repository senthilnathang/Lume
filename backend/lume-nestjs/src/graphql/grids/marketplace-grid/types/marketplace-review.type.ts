import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { Node, Auditable } from '../../../shared/interfaces/index.js';

@ObjectType('MarketplaceReview', { implements: [Node, Auditable] })
export class MarketplaceReviewType implements Node, Auditable {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  pluginName: string;

  @Field(() => Int)
  userId: number;

  @Field(() => Int)
  rating: number;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  body?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
