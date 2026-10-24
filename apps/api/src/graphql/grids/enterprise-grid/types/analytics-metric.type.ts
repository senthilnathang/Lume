import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType('AnalyticsMetric')
export class AnalyticsMetricType {
  @Field(() => String)
  name: string;

  @Field(() => Float)
  min: number;

  @Field(() => Float)
  max: number;

  @Field(() => String)
  avg: string;

  @Field(() => Int)
  count: number;

  @Field(() => Int)
  samples: number;
}
