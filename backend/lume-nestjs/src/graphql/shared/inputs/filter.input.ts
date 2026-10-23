import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class FilterInput {
  @Field(() => String)
  field: string;

  @Field(() => String, { defaultValue: 'eq' })
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'like'
    | 'ilike'
    | 'startsWith'
    | 'endsWith'
    | 'contains' = 'eq';

  @Field(() => GraphQLJSON)
  value: any;
}
