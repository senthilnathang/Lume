import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('EntityField')
export class EntityFieldType {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  entityId: number;

  @Field(() => String)
  slug: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  label: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  required?: boolean;

  @Field(() => Boolean, { nullable: true })
  unique?: boolean;

  @Field(() => String, { nullable: true })
  validation?: string;

  @Field(() => Int, { nullable: true })
  position?: number;

  @Field(() => String, { nullable: true })
  defaultValue?: string;

  @Field(() => String, { nullable: true })
  helpText?: string;

  @Field(() => String, { nullable: true })
  selectOptions?: string;

  @Field(() => Int, { nullable: true })
  lookupEntityId?: number;

  @Field(() => String, { nullable: true })
  lookupField?: string;

  @Field(() => String, { nullable: true })
  formulaExpression?: string;

  @Field(() => Int)
  sequence: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;
}
