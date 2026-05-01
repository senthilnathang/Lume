import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
class MenuItemReorderInput {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  parentId?: string;

  @Field(() => Int)
  sequence: number;
}

@InputType()
export class ReorderMenuInput {
  @Field(() => [MenuItemReorderInput])
  items: MenuItemReorderInput[];
}
