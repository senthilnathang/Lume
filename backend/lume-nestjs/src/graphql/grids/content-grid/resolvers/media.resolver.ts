import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard, GqlRbacGuard } from '../../guards/index.js';
import { GqlTenant } from '../../decorators/index.js';
import { MediaType } from '../types/media.type.js';
import { PaginationInput } from '../../shared/inputs/pagination.input.js';
import { Paginated } from '../../shared/types/paginated.type.js';
import { UploadMediaInput } from '../inputs/upload-media.input.js';

@Resolver(() => MediaType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class MediaResolver {
  @Query(() => Paginated(MediaType))
  async mediaLibrary(
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
    @GqlTenant() tenantId?: number,
  ) {
    const limit = Math.min(pagination?.limit || 20, 100);
    const page = pagination?.page || 1;
    // TODO: Implement media service call
    return {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    };
  }

  @Query(() => MediaType, { nullable: true })
  async mediaItem(
    @Args('id', { type: () => String }) id: string,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement media service call
    return null;
  }

  @Mutation(() => MediaType)
  async addMedia(
    @Args('input') input: UploadMediaInput,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement media service call
    return null;
  }

  @Mutation(() => MediaType)
  async updateMedia(
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UploadMediaInput,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement media service call
    return null;
  }

  @Mutation(() => Boolean)
  async deleteMedia(
    @Args('id', { type: () => String }) id: string,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement media service call
    return true;
  }
}
