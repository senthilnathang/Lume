import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

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

  @Field(() => GraphQLJSON, { nullable: true })
  config?: any;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
