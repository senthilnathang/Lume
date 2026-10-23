import { ObjectType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType('AnalyticsDashboard')
export class AnalyticsDashboardType {
  @Field(() => GraphQLJSON)
  summary: Record<string, unknown>;

  @Field(() => GraphQLJSON)
  performance: Record<string, unknown>;

  @Field(() => GraphQLJSON)
  events: Record<string, unknown>;
}
