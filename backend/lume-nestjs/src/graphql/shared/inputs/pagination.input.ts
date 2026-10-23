import { BadRequestException } from '@nestjs/common';
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

export function normalizePagination(input?: Partial<PaginationInput>) {
  const page = input?.page ?? 1;
  const limit = input?.limit ?? 20;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1) {
    throw new BadRequestException('Pagination page and limit must be positive integers');
  }
  return { page, limit: Math.min(limit, 100) };
}
