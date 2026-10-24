import { EntityService } from '@modules/base/services/entity.service';
import { normalizePagination } from '../../../shared/inputs/pagination.input';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlJwtGuard } from '../../../guards/gql-jwt.guard';
import { GqlRbacGuard } from '../../../guards/gql-rbac.guard';
import { GqlCurrentUser } from '../../../decorators/gql-current-user.decorator';
import { GqlTenant } from '../../../decorators/gql-tenant.decorator';
import { Permissions } from '../../../../core/decorators/permissions.decorator';
import { PaginationInput } from '../../../shared/inputs/pagination.input';
import { Paginated } from '../../../shared/types/paginated.type';
import { EntityType } from '../types/entity.type';
import { EntityFieldType } from '../types/entity-field.type';
import { CreateEntityInput } from '../inputs/create-entity.input';
import { UpdateEntityInput } from '../inputs/update-entity.input';
import type { GqlContext, JwtPayload } from '../../../graphql.context';

/**
 * DataGrid Entity Resolver
 * Queries and mutations for Entity CRUD operations
 * Delegates to existing EntityService for business logic
 */
@Resolver(() => EntityType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class EntityResolver {
  // Inject existing EntityService when available
  constructor(private readonly entityService: EntityService) {}

  @Query(() => [EntityType], { name: 'entities' })
  @Permissions('base.entities.read')
  async entities(
    @Args('pagination', { nullable: true }) pagination: PaginationInput,
    @GqlCurrentUser() user: JwtPayload,
    @GqlTenant() companyId: number,
  ): Promise<EntityType[]> {
    const result = await this.entityService.listEntities(normalizePagination(pagination));
    return result.items;
  }

  @Query(() => EntityType, { name: 'entity', nullable: true })
  @Permissions('base.entities.read')
  async entity(
    @Args('id', { type: () => Int }) id: number,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<EntityType | null> {
    try { return await this.entityService.getEntity(id); }
    catch (error) { if (error.message === 'Entity not found') return null; throw error; }
  }

  @Mutation(() => EntityType)
  @Permissions('base.entities.create')
  async createEntity(
    @Args('input') input: CreateEntityInput,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<EntityType> {
    return this.entityService.createEntity(input, user.sub);
  }

  @Mutation(() => EntityType)
  @Permissions('base.entities.update')
  async updateEntity(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateEntityInput,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<EntityType> {
    return this.entityService.updateEntity(id, input);
  }

  @Mutation(() => Boolean)
  @Permissions('base.entities.delete')
  async deleteEntity(
    @Args('id', { type: () => Int }) id: number,
    @GqlCurrentUser() user: JwtPayload,
  ): Promise<boolean> {
    await this.entityService.deleteEntity(id);
    return true;
  }

  @ResolveField('fields', () => [EntityFieldType])
  async fields(
    @Parent() entity: EntityType,
    @Context() ctx: GqlContext,
  ): Promise<EntityFieldType[]> {
    // Use DataLoader to batch-load fields for multiple entities
    return ctx.loaders.entityFieldsByEntityId.load(entity.id);
  }
}
