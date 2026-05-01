import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateMenuInput {
  @Field(() => String)
  name: string;

  @Field(() => String)
  location: string; // 'header' | 'footer' | 'sidebar'
}
