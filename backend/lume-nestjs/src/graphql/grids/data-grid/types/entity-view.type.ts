import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('EntityView')
export class EntityViewType {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  entityId: number;

  @Field(() => String)
  name: string;

  @Field(() => String)
  type: string;

  @Field(() => Boolean, { nullable: true })
  isDefault?: boolean;

  @Field(() => Object, { nullable: true }) // JSON scalar
  config?: any;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
