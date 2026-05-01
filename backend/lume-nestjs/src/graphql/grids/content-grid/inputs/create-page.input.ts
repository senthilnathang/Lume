import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreatePageInput {
  @Field(() => String)
  title: string;

  @Field(() => String)
  slug: string;

  @Field(() => GraphQLJSON, { nullable: true })
  content?: Record<string, unknown>;

  @Field(() => String, { nullable: true, defaultValue: 'draft' })
  status?: string;

  @Field(() => String, { nullable: true })
  metaTitle?: string;

  @Field(() => String, { nullable: true })
  metaDescription?: string;

  @Field(() => String, { nullable: true })
  ogImage?: string;

  @Field(() => Int, { nullable: true })
  authorId?: number;
}
