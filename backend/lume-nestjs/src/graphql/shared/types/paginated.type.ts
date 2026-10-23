import { Type } from '@nestjs/common';
import { ObjectType, Field, Int } from '@nestjs/graphql';

export interface PaginatedType<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const pageTypes = new WeakMap<Type<unknown>, Type<PaginatedType<unknown>>>();

export function Paginated<T>(classRef: Type<T>): Type<PaginatedType<T>> {
  const existing = pageTypes.get(classRef);
  if (existing) return existing as Type<PaginatedType<T>>;

  @ObjectType(`${classRef.name}Page`)
  abstract class PaginatedObject implements PaginatedType<T> {
    @Field(() => [classRef])
    items: T[];

    @Field(() => Int)
    total: number;

    @Field(() => Int)
    page: number;

    @Field(() => Int)
    limit: number;

    @Field(() => Int)
    totalPages: number;

    @Field(() => Boolean)
    hasNextPage: boolean;

    @Field(() => Boolean)
    hasPreviousPage: boolean;
  }

  pageTypes.set(classRef, PaginatedObject as Type<PaginatedType<unknown>>);
  return PaginatedObject as Type<PaginatedType<T>>;
}
