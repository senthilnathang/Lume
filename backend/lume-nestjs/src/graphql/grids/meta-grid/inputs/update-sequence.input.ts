import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class UpdateSequenceInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  prefix?: string;

  @Field(() => Int, { nullable: true })
  nextValue?: number;

  @Field(() => Int, { nullable: true })
  step?: number;

  @Field(() => Int, { nullable: true })
  padding?: number;

  @Field(() => String, { nullable: true })
  format?: string;
}
