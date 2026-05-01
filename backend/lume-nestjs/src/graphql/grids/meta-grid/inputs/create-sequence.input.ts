import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateSequenceInput {
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  prefix?: string;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  nextValue?: number;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  step?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  padding?: number;

  @Field(() => String, { nullable: true, defaultValue: '{prefix}{number}' })
  format?: string;
}
