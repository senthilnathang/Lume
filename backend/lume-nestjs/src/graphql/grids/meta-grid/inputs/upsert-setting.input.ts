import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class UpsertSettingInput {
  @Field(() => String)
  key: string;

  @Field(() => GraphQLJSON)
  value: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  group?: string;

  @Field(() => String, { nullable: true })
  label?: string;
}
