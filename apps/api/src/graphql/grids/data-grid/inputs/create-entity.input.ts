import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateEntityInput {
  @Field(() => String)
  name: string;

  @Field(() => String)
  label: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int, { nullable: true })
  moduleId?: number;
}
