import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class UpdateTenantInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  domain?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  config?: Record<string, unknown>;

  @Field(() => Boolean, { nullable: true })
  active?: boolean;
}
