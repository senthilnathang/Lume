import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class SubmitReviewInput {
  @Field(() => String)
  pluginName: string;

  @Field(() => Int)
  rating: number;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  body?: string;
}
