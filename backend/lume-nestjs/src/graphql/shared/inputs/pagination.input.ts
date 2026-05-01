import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class PaginationInput {
  @Field(() => Int, { defaultValue: 1 })
  page: number = 1;

  @Field(() => Int, { defaultValue: 20 })
  limit: number = 20;

  @Field(() => String, { nullable: true })
  sortBy?: string;

  @Field(() => String, { nullable: true, defaultValue: 'ASC' })
  sortOrder?: 'ASC' | 'DESC';
}
