import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class UpdatePageInput {
  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  slug?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  content?: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  status?: string;

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
}
