import { ObjectType, Field, Int, JSON as GraphQLJSON } from '@nestjs/graphql';

@ObjectType('EntityFieldContext')
export class EntityFieldContextType {
  @Field()
  name: string;

  @Field()
  type: string;

  @Field()
  label: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  required: boolean;

  @Field({ nullable: true })
  selectOptions?: string;
}

@ObjectType('EntityContext')
export class EntityContextType {
  @Field()
  name: string;

  @Field()
  label: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  pluralLabel: string;

  @Field(() => [EntityFieldContextType])
  fields: EntityFieldContextType[];

  @Field(() => GraphQLJSON, { nullable: true })
  aiMetadata?: any;
}

@ObjectType('SchemaContext')
export class SchemaContextType {
  @Field()
  buildTime: Date;

  @Field(() => [EntityContextType])
  entities: EntityContextType[];

  @Field()
  prompt: string;
}
