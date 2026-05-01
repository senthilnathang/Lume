import { InputType, Field } from '@nestjs/graphql';
import { FilterInput } from '../../shared/inputs/filter.input.js';

@InputType()
export class ExportOptionsInput {
  @Field(() => String)
  entity: string;

  @Field(() => String, { nullable: true, defaultValue: 'json' })
  format?: 'json' | 'csv';

  @Field(() => [FilterInput], { nullable: true })
  filters?: FilterInput[];
}
