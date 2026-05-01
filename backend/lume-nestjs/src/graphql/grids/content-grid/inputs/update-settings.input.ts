import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class UpdateSettingsInput {
  @Field(() => String, { nullable: true })
  siteName?: string;

  @Field(() => String, { nullable: true })
  siteDescription?: string;

  @Field(() => String, { nullable: true })
  logoUrl?: string;

  @Field(() => String, { nullable: true })
  favicon?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  seoSettings?: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  customCss?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  codeInjection?: Record<string, unknown>;
}
