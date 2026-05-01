import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class CreateTenantInput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  domain: string;

  @Field(() => GraphQLJSON, { nullable: true })
  config?: Record<string, unknown>;
}
