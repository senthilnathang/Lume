import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RecordRuleManagementService } from '../../../../modules/base/services/record-rule-management.service';
import { normalizePagination } from '../../../shared/inputs/pagination.input';
import { GqlJwtGuard } from '../../../guards/gql-jwt.guard';
import { GqlRbacGuard } from '../../../guards/gql-rbac.guard';
import { GqlCurrentUser } from '../../../decorators/gql-current-user.decorator';
import { Permissions } from '../../../../core/decorators/permissions.decorator';
import { PaginationInput } from '../../../shared/inputs/pagination.input';
import { RecordRuleType } from '../types/record-rule.type';
import type { JwtPayload } from '../../../graphql.context';

/**
 * PolicyGrid RecordRule Resolver
 * Queries and mutations for row-level data access policies
 * Delegates to RecordRuleService for business logic
 */
@Resolver(() => RecordRuleType)
@UseGuards(GqlJwtGuard, GqlRbacGuard)
export class RecordRuleResolver {
  constructor(private readonly rules: RecordRuleManagementService) {}

  @Query(() => [RecordRuleType], { name: 'recordRules' })
  @Permissions('base.record_rules.read')
  async recordRules(
    @Args('modelName', { nullable: true }) modelName?: string,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<RecordRuleType[]> {
    const { page, limit } = normalizePagination(pagination);
    return this.rules.list(modelName, page, limit);
  }

  @Query(() => RecordRuleType, { name: 'recordRule', nullable: true })
  @Permissions('base.record_rules.read')
  async recordRule(
    @Args('id', { type: () => Int }) id: number,
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<RecordRuleType | null> {
    return this.rules.get(id);
  }

  @Mutation(() => RecordRuleType)
  @Permissions('base.record_rules.create')
  async createRecordRule(
    @Args('name') name: string,
    @Args('modelName') modelName: string,
    @Args('action') action: string,
    @Args('domain') domain: string,
    @Args('groups', { nullable: true }) groups?: string,
    @Args('users', { nullable: true }) users?: string,
    @Args('sequence', { type: () => Int, nullable: true }) sequence?: number,
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<RecordRuleType> {
    return this.rules.create({ name, modelName, action, domain, groups, users, sequence: sequence ?? undefined }, user.sub);
  }

  @Mutation(() => RecordRuleType)
  @Permissions('base.record_rules.update')
  async updateRecordRule(
    @Args('id', { type: () => Int }) id: number,
    @Args('name', { nullable: true }) name?: string,
    @Args('action', { nullable: true }) action?: string,
    @Args('domain', { nullable: true }) domain?: string,
    @Args('groups', { nullable: true }) groups?: string,
    @Args('users', { nullable: true }) users?: string,
    @Args('isActive', { nullable: true }) isActive?: boolean,
    @Args('sequence', { type: () => Int, nullable: true }) sequence?: number,
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<RecordRuleType> {
    return this.rules.update(id, { name, action, domain, groups, users, isActive, sequence }, user.sub);
  }

  @Mutation(() => Boolean)
  @Permissions('base.record_rules.delete')
  async deleteRecordRule(
    @Args('id', { type: () => Int }) id: number,
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<boolean> {
    return this.rules.delete(id, user.sub);
  }

  @Mutation(() => [RecordRuleType])
  @Permissions('base.record_rules.update')
  async reorderRecordRules(
    @Args('rules', { type: () => [Int] }) ruleIds: number[],
    @GqlCurrentUser() user?: JwtPayload,
  ): Promise<RecordRuleType[]> {
    return this.rules.reorder(ruleIds, user.sub);
  }
}
