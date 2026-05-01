import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('MenuItem')
export class MenuItemType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  label: string;

  @Field(() => String, { nullable: true })
  url?: string;

  @Field(() => Int, { nullable: true })
  pageId?: number;

  @Field(() => String, { nullable: true })
  parentId?: string;

  @Field(() => Int)
  sequence: number;

  @Field(() => [MenuItemType], { nullable: true })
  children?: MenuItemType[];
}
