import { ObjectType, Field } from '@nestjs/graphql';
import { Node, Auditable } from '../../shared/interfaces/index.js';
import { MenuItemType } from './menu-item.type.js';

@ObjectType('Menu', { implements: [Node, Auditable] })
export class MenuType implements Node, Auditable {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  location: string; // 'header' | 'footer' | 'sidebar'

  @Field(() => [MenuItemType], { nullable: true })
  items?: MenuItemType[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;
}
