import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard, GqlRbacGuard } from '../../guards/index.js';
import { SequenceType } from '../types/sequence.type.js';
import { CreateSequenceInput } from '../inputs/create-sequence.input.js';
import { UpdateSequenceInput } from '../inputs/update-sequence.input.js';

@Resolver(() => SequenceType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class SequenceResolver {
  @Query(() => [SequenceType])
  async sequences() {
    // TODO: Implement sequence service call
    return [];
  }

  @Query(() => SequenceType, { nullable: true })
  async sequence(@Args('id', { type: () => String }) id: string) {
    // TODO: Implement sequence service call
    return null;
  }

  @Query(() => Int)
  async nextSequenceValue(@Args('id', { type: () => String }) id: string) {
    // TODO: Implement sequence service call
    return 1;
  }

  @Mutation(() => SequenceType)
  async createSequence(@Args('input') input: CreateSequenceInput) {
    // TODO: Implement sequence service call
    return null;
  }

  @Mutation(() => SequenceType)
  async updateSequence(
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UpdateSequenceInput,
  ) {
    // TODO: Implement sequence service call
    return null;
  }

  @Mutation(() => Boolean)
  async deleteSequence(@Args('id', { type: () => String }) id: string) {
    // TODO: Implement sequence service call
    return true;
  }
}
