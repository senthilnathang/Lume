import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Context,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { TeamAdapter, TeamMemberGqlInput, TeamMemberGqlFilter } from '../adapters/team.adapter.js';
import { GraphQLService } from '../graphql.service.js';
import { AuthGuard } from '../guards/auth.guard.js';

export interface TeamMember {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string;
  bio?: string;
  socialLinks: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMemberConnection {
  edges: Array<{ node: TeamMember; cursor: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
    totalCount: number;
  };
}

@Resolver('TeamMember')
@UseGuards(AuthGuard)
export class TeamResolver {
  constructor(
    private teamAdapter: TeamAdapter,
    private graphqlService: GraphQLService,
  ) {}

  @Query('teamMember')
  async getTeamMember(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<TeamMember> {
    this.graphqlService.logOperation('getTeamMember', { id }, context);

    if (!this.graphqlService.hasRole(['admin', 'manager'], context)) {
      throw new GraphQLError('Insufficient permissions to view team members', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.teamAdapter.getTeamMember(id, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Query('teamMembers')
  async listTeamMembers(
    @Args('filter', { nullable: true }) filter?: TeamMemberGqlFilter,
    @Args('page', { type: () => Int, defaultValue: 1 }) page?: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit?: number,
    @Context() context?: any,
  ): Promise<TeamMemberConnection> {
    this.graphqlService.logOperation('listTeamMembers', { filter, page, limit }, context);

    if (!this.graphqlService.hasRole(['admin', 'manager', 'viewer'], context)) {
      throw new GraphQLError('Insufficient permissions to view team members', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.teamAdapter.listTeamMembers(filter || {}, { page, limit }, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('createTeamMember')
  async createTeamMember(
    @Args('input') input: TeamMemberGqlInput,
    @Context() context: any,
  ): Promise<TeamMember> {
    this.graphqlService.logOperation('createTeamMember', { input }, context);
    this.graphqlService.createAuditLog('CREATE', 'team', 'N/A', input, context);

    if (!this.graphqlService.hasRole(['admin', 'manager'], context)) {
      throw new GraphQLError('Insufficient permissions to create team members', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.teamAdapter.createTeamMember(input, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('updateTeamMember')
  async updateTeamMember(
    @Args('id') id: string,
    @Args('input') input: TeamMemberGqlInput,
    @Context() context: any,
  ): Promise<TeamMember> {
    this.graphqlService.logOperation('updateTeamMember', { id, input }, context);
    this.graphqlService.createAuditLog('UPDATE', 'team', id, input, context);

    if (!this.graphqlService.hasRole(['admin', 'manager'], context)) {
      throw new GraphQLError('Insufficient permissions to update team members', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.teamAdapter.updateTeamMember(id, input, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('updateTeamMemberRole')
  async updateTeamMemberRole(
    @Args('id') id: string,
    @Args('role') role: string,
    @Context() context: any,
  ): Promise<TeamMember> {
    this.graphqlService.logOperation('updateTeamMemberRole', { id, role }, context);
    this.graphqlService.createAuditLog('UPDATE_ROLE', 'team', id, { role }, context);

    if (!this.graphqlService.hasRole(['admin', 'manager'], context)) {
      throw new GraphQLError('Insufficient permissions to update team member roles', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.teamAdapter.updateTeamMemberRole(id, role, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('updateTeamMemberStatus')
  async updateTeamMemberStatus(
    @Args('id') id: string,
    @Args('status') status: string,
    @Context() context: any,
  ): Promise<TeamMember> {
    this.graphqlService.logOperation('updateTeamMemberStatus', { id, status }, context);
    this.graphqlService.createAuditLog('UPDATE_STATUS', 'team', id, { status }, context);

    if (!this.graphqlService.hasRole(['admin', 'manager'], context)) {
      throw new GraphQLError('Insufficient permissions to update team member status', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.teamAdapter.updateTeamMemberStatus(id, status, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }

  @Mutation('deleteTeamMember')
  async deleteTeamMember(
    @Args('id') id: string,
    @Context() context: any,
  ): Promise<boolean> {
    this.graphqlService.logOperation('deleteTeamMember', { id }, context);
    this.graphqlService.createAuditLog('DELETE', 'team', id, {}, context);

    if (!this.graphqlService.hasRole(['admin'], context)) {
      throw new GraphQLError('Insufficient permissions to delete team members', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return this.teamAdapter.deleteTeamMember(id, {
      userId: context.user.id,
      tenantId: context.user.tenantId,
      roles: context.user.roles,
      ipAddress: context.req?.ip,
    });
  }
}
