import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType('WebsiteSettings')
export class WebsiteSettingsType {
  @Field(() => String)
  siteName: string;

  @Field(() => String)
  siteDescription: string;

  @Field(() => String, { nullable: true })
  logoUrl?: string;

  @Field(() => String, { nullable: true })
  favicon?: string;

  @Field(() => GraphQLJSON)
  seoSettings: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  customCss?: string;

  @Field(() => GraphQLJSON)
  codeInjection: Record<string, unknown>;
}
