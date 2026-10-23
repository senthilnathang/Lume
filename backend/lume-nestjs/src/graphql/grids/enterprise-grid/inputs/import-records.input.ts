import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class ImportRecordsInput {
  @Field(() => String)
  entity: string;

  @Field(() => GraphQLJSON)
  records: Record<string, unknown>;

  @Field(() => Int, { nullable: true })
  batchSize?: number;
}
