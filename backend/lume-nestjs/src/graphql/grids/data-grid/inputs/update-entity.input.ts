import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class UpdateEntityInput {
  @Field(() => String, { nullable: true })
  label?: string;

  @Field(() => String, { nullable: true })
  description?: string;
}
