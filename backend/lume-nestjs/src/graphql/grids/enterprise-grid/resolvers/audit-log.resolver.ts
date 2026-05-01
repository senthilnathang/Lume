import { Resolver, Query, Subscription, Args, Int } from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { GqlJwtGuard, GqlRbacGuard } from '../../guards/index.js';
import { GqlCurrentUser, GqlTenant } from '../../decorators/index.js';
import { JwtPayload } from '../../../auth/jwt.payload.js';
import { AuditLogType } from '../types/audit-log.type.js';
import { PaginationInput } from '../../shared/inputs/pagination.input.js';
import { Paginated } from '../../shared/types/paginated.type.js';
import { AuditFilterInput } from '../inputs/audit-filter.input.js';

@Resolver(() => AuditLogType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class AuditLogResolver {
  constructor(@Inject('PubSub') private pubSub: PubSub) {}

  @Query(() => Paginated(AuditLogType))
  async auditLogs(
    @Args('filter', { nullable: true }) filter?: AuditFilterInput,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
    @GqlTenant() tenantId?: number,
  ) {
    const limit = Math.min(pagination?.limit || 20, 100);
    const page = pagination?.page || 1;
    // TODO: Implement audit log service call
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

  @Query(() => AuditLogType, { nullable: true })
  async auditLog(
    @Args('id', { type: () => String }) id: string,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement audit log service call
    return null;
  }

  @Query(() => [AuditLogType])
  async recordAuditHistory(
    @Args('entity') entity: string,
    @Args('recordId', { type: () => Int }) recordId: number,
    @GqlTenant() tenantId?: number,
  ) {
    // TODO: Implement audit log service call
    return [];
  }

  @Subscription(() => AuditLogType, {
    filter: (payload, variables, context) => {
      if (!context.user?.company_id) return false;
      // TODO: Check tenant isolation
      return !variables.entity || payload.auditLogCreated.entity === variables.entity;
    },
  })
  auditLogCreated(
    @Args('entity', { type: () => String, nullable: true }) entity?: string,
    @GqlTenant() tenantId?: number,
  ) {
    return this.pubSub.asyncIterableIterator(['AUDIT_LOG_CREATED']);
  }
}
