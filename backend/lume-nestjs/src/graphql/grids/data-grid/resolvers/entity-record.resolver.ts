import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RecordService } from '@modules/base/services/record.service';
import { FieldPermissionService } from '@modules/base/services/field-permission.service';
import { GqlJwtGuard } from '../../../guards/gql-jwt.guard';
import { GqlRbacGuard } from '../../../guards/gql-rbac.guard';
import { GqlCurrentUser } from '../../../decorators/gql-current-user.decorator';
import { GqlTenant } from '../../../decorators/gql-tenant.decorator';
import { Permissions } from '../../../../core/decorators/permissions.decorator';
import { PaginationInput, normalizePagination } from '../../../shared/inputs/pagination.input';
import { Paginated } from '../../../shared/types/paginated.type';
import { EntityRecordType } from '../types/entity-record.type';
import { CreateRecordInput } from '../inputs/create-record.input';
import { UpdateRecordInput } from '../inputs/update-record.input';
import type { GqlContext, JwtPayload } from '../../../graphql.context';

const EntityRecordPage = Paginated(EntityRecordType);

@Resolver(() => EntityRecordType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class EntityRecordResolver {
  constructor(private readonly records: RecordService, private readonly fields: FieldPermissionService) {}

  private tenant(companyId: number) {
    if (!Number.isSafeInteger(companyId) || companyId < 1) throw new ForbiddenException('Company ID required for multi-tenant isolation');
    return companyId;
  }
  private admin(user: JwtPayload) { return ['admin', 'super_admin'].includes(user.role_name); }
  private async mask(record: any, user: JwtPayload) {
    if (!record || this.admin(user)) return record;
    if (!user.role_id) throw new ForbiddenException('Role required');
    return { ...record, data: await this.fields.filterRecordForRole(record.entityId, record.data, user.role_id) };
  }
  private async writable(entityId: number, data: any, user: JwtPayload) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new BadRequestException('Record data must be an object');
    if (this.admin(user)) return;
    if (!user.role_id) throw new ForbiddenException('Role required');
    const allowed = new Set(await this.fields.getWritableFields(entityId, user.role_id));
    for (const field of Object.keys(data)) if (!allowed.has(field)) throw new ForbiddenException(`Field is not writable: ${field}`);
  }

  @Query(() => EntityRecordPage, { name: 'entityRecords' })
  @Permissions('base.entity_records.read')
  async entityRecords(
    @Args('entityId', { type: () => Int }) entityId: number,
    @Args('pagination', { nullable: true }) pagination: PaginationInput,
    @GqlCurrentUser() user: JwtPayload,
    @GqlTenant() companyId: number,
    @Context() _ctx: GqlContext,
  ): Promise<any> {
    const { page, limit } = normalizePagination(pagination);
    const result = await this.records.listRecords(entityId, this.tenant(companyId), { page, limit, userId: user.sub });
    const { total } = result.pagination;
    const totalPages = Math.ceil(total / limit);
    return { items: await Promise.all(result.records.map(record => this.mask(record, user))), total, totalPages, page, limit, hasNextPage: page < totalPages, hasPreviousPage: page > 1 };
  }

  @Query(() => EntityRecordType, { nullable: true, name: 'entityRecord' })
  @Permissions('base.entity_records.read')
  async entityRecord(
    @Args('entityId', { type: () => Int }) entityId: number,
    @Args('recordId', { type: () => Int }) recordId: number,
    @GqlCurrentUser() user: JwtPayload,
    @GqlTenant() companyId: number,
    @Context() _ctx: GqlContext,
  ): Promise<EntityRecordType | null> {
    const record = await this.records.getRecord(recordId, this.tenant(companyId), user.sub);
    return record?.entityId === entityId ? this.mask(record, user) : null;
  }

  @Mutation(() => EntityRecordType)
  @Permissions('base.entity_records.create')
  async createEntityRecord(
    @Args('entityId', { type: () => Int }) entityId: number,
    @Args('input') input: CreateRecordInput,
    @GqlCurrentUser() user: JwtPayload,
    @GqlTenant() companyId: number,
    @Context() _ctx: GqlContext,
  ): Promise<EntityRecordType> {
    this.tenant(companyId);
    await this.writable(entityId, input.data, user);
    return this.mask(await this.records.createRecord(entityId, input.data, companyId, user.sub), user);
  }

  @Mutation(() => EntityRecordType)
  @Permissions('base.entity_records.update')
  async updateEntityRecord(
    @Args('entityId', { type: () => Int }) entityId: number,
    @Args('recordId', { type: () => Int }) recordId: number,
    @Args('input') input: UpdateRecordInput,
    @GqlCurrentUser() user: JwtPayload,
    @GqlTenant() companyId: number,
    @Context() _ctx: GqlContext,
  ): Promise<EntityRecordType> {
    const existing = await this.records.getRecord(recordId, this.tenant(companyId), user.sub);
    if (!existing || existing.entityId !== entityId) throw new NotFoundException('Record not found');
    await this.writable(entityId, input.data, user);
    return this.mask(await this.records.updateRecord(recordId, input.data, companyId, user.sub), user);
  }

  @Mutation(() => Boolean)
  @Permissions('base.entity_records.delete')
  async deleteEntityRecord(
    @Args('recordId', { type: () => Int }) recordId: number,
    @GqlCurrentUser() user: JwtPayload,
    @GqlTenant() companyId: number,
  ): Promise<boolean> {
    return this.records.deleteRecord(recordId, true, this.tenant(companyId), user.sub);
  }

  @Mutation(() => [EntityRecordType])
  @Permissions('base.entity_records.delete')
  async deleteEntityRecords(
    @Args('recordIds', { type: () => [Int] }) recordIds: number[],
    @GqlCurrentUser() user: JwtPayload,
    @GqlTenant() companyId: number,
  ): Promise<EntityRecordType[]> {
    const records = await this.records.bulkDeleteRecords(recordIds, this.tenant(companyId), user.sub);
    return Promise.all(records.map(record => this.mask(record, user)));
  }
}
