import { tenantEventAllowed } from '../../../tenant';
import { Resolver, Query, Subscription, Args, Int } from '@nestjs/graphql';
import { UseGuards, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { GqlJwtGuard, GqlRbacGuard } from '../../../guards/index.js';
import { GqlCurrentUser, GqlTenant, Permissions } from '../../../decorators/index.js';
import type { JwtPayload } from '../../../graphql.context';
import { AuditLogType } from '../types/audit-log.type.js';
import { PaginationInput, normalizePagination } from '../../../shared/inputs/pagination.input.js';
import { Paginated } from '../../../shared/types/paginated.type.js';
import { AuditFilterInput } from '../inputs/audit-filter.input.js';
import { AuditService, auditGraphqlView } from '@modules/audit/services/audit.service';

const AuditLogPage = Paginated(AuditLogType);

@Resolver(() => AuditLogType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class AuditLogResolver {
  constructor(@Inject('PubSub') private pubSub: PubSub, private audit: AuditService) {}

  @Query(() => AuditLogPage)
  @Permissions('audit.read')
  async auditLogs(
    @Args('filter', { nullable: true }) filter?: AuditFilterInput,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    const { page, limit } = normalizePagination(pagination);
    if (filter?.userId != null && !/^[1-9]\d*$/.test(filter.userId)) throw new BadRequestException('Invalid audit user ID');
    const result = await this.audit.findAll({ page, limit, resource_type: filter?.entity ?? undefined,
      action: filter?.action ?? undefined, user_id: filter?.userId == null ? undefined : Number(filter.userId),
      start_date: filter?.fromDate?.toISOString(), end_date: filter?.toDate?.toISOString() }, user?.sub);
    return {
      items: result.data.map(auditGraphqlView),
      total: result.meta.total,
      page,
      limit,
      totalPages: result.meta.pages,
      hasNextPage: page < result.meta.pages,
      hasPreviousPage: page > 1,
    };
  }

  @Query(() => AuditLogType, { nullable: true })
  @Permissions('audit.read')
  async auditLog(
    @Args('id', { type: () => String }) id: string,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!/^[1-9]\d*$/.test(id)) throw new BadRequestException('Invalid audit ID');
    try { return auditGraphqlView((await this.audit.findById(Number(id), user?.sub)).data); }
    catch (error) { if (error instanceof NotFoundException) return null; throw error; }
  }

  @Query(() => [AuditLogType])
  @Permissions('audit.read')
  async recordAuditHistory(
    @Args('entity') entity: string,
    @Args('recordId', { type: () => Int }) recordId: number,
    @GqlCurrentUser() user?: JwtPayload,
  ) {
    if (!Number.isSafeInteger(recordId) || recordId < 1) throw new BadRequestException('Invalid record ID');
    return (await this.audit.findAll({ resource_type: entity, record_id: String(recordId), page: 1, limit: 100 }, user?.sub)).data.map(auditGraphqlView);
  }

  @Subscription(() => AuditLogType, {
    filter: async (payload, variables, context) => {
      if (!await tenantEventAllowed(context, payload.auditLogCreated?.companyId)) return false;
      return !variables.entity || payload.auditLogCreated.entity === variables.entity;
    },
  })
  @Permissions('audit.read')
  auditLogCreated(
    @Args('entity', { type: () => String, nullable: true }) entity?: string,
    @GqlTenant() tenantId?: number,
  ) {
    return this.pubSub.asyncIterableIterator(['AUDIT_LOG_CREATED']);
  }
}
