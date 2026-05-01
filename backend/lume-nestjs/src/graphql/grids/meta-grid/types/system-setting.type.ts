import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType('SystemSetting')
export class SystemSettingType {
  @Field(() => String)
  key: string;

  @Field(() => GraphQLJSON)
  value: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  group?: string;

  @Field(() => String, { nullable: true })
  label?: string;

  @Field(() => Date)
  updatedAt: Date;
}
