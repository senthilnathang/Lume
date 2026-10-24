import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class MarketplaceFilterInput {
  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String, { nullable: true })
  pricing?: string;

  @Field(() => String, { nullable: true })
  sortBy?: 'downloads' | 'rating' | 'newest';

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => Int, { nullable: true })
  limit?: number;
}
