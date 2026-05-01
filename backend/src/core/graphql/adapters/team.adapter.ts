import { Injectable } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { BaseModuleAdapter, AdapterContext } from './base.adapter.js';
import { TeamService } from '../../services/team.service.js';

export interface TeamMemberGqlInput {
  name: string;
  email: string;
  role?: string;
  status?: string;
  avatar?: string;
  bio?: string;
  socialLinks?: Record<string, string>;
}

export interface TeamMemberGqlFilter {
  role?: string;
  status?: string;
  search?: string;
}

@Injectable()
export class TeamAdapter extends BaseModuleAdapter {
  constructor(private teamService: TeamService) {
    super('team');
  }

  async getTeamMember(id: string, context: AdapterContext) {
    try {
      this.ensureTenantOwnership({ tenantId: context.tenantId }, context);
      const member = await this.teamService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!member) {
        throw new GraphQLError('Team member not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return this.transformToGraphQL(member);
    } catch (error) {
      this.handleServiceError(error, 'getTeamMember');
    }
  }

  async listTeamMembers(
    filter: TeamMemberGqlFilter,
    pagination: { page: number; limit: number },
    context: AdapterContext,
  ) {
    try {
      const where: any = { tenantId: context.tenantId };

      if (filter?.role) {
        where.role = filter.role;
      }
      if (filter?.status) {
        where.status = filter.status;
      }
      if (filter?.search) {
        where.OR = [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { email: { contains: filter.search, mode: 'insensitive' } },
          { bio: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      const skip = (pagination.page - 1) * pagination.limit;
      const [members, total] = await Promise.all([
        this.teamService.find({
          where,
          skip,
          take: pagination.limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.teamService.count({ where }),
      ]);

      return {
        edges: members.map((member) => ({
          node: this.transformToGraphQL(member),
          cursor: Buffer.from(member.id).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: skip + members.length < total,
          hasPreviousPage: pagination.page > 1,
          startCursor: members.length
            ? Buffer.from(members[0].id).toString('base64')
            : null,
          endCursor: members.length
            ? Buffer.from(members[members.length - 1].id).toString('base64')
            : null,
          totalCount: total,
        },
      };
    } catch (error) {
      this.handleServiceError(error, 'listTeamMembers');
    }
  }

  async createTeamMember(input: TeamMemberGqlInput, context: AdapterContext) {
    try {
      this.validateCreateInput(input);

      const memberData = this.transformFromGraphQL(input, context);
      memberData.tenantId = context.tenantId;

      const member = await this.teamService.create(memberData);
      return this.transformToGraphQL(member);
    } catch (error) {
      this.handleServiceError(error, 'createTeamMember');
    }
  }

  async updateTeamMember(
    id: string,
    input: Partial<TeamMemberGqlInput>,
    context: AdapterContext,
  ) {
    try {
      const member = await this.teamService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!member) {
        throw new GraphQLError('Team member not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      this.ensureTenantOwnership(member, context);

      const updateData = this.transformFromGraphQL(input as TeamMemberGqlInput, context);
      const updated = await this.teamService.update(id, updateData);
      return this.transformToGraphQL(updated);
    } catch (error) {
      this.handleServiceError(error, 'updateTeamMember');
    }
  }

  async deleteTeamMember(id: string, context: AdapterContext) {
    try {
      const member = await this.teamService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!member) {
        throw new GraphQLError('Team member not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      this.ensureTenantOwnership(member, context);
      await this.teamService.delete(id);

      return true;
    } catch (error) {
      this.handleServiceError(error, 'deleteTeamMember');
    }
  }

  async updateTeamMemberRole(
    id: string,
    role: string,
    context: AdapterContext,
  ) {
    try {
      const validRoles = ['LEAD', 'MEMBER', 'CONTRIBUTOR', 'VIEWER'];
      if (!validRoles.includes(role)) {
        throw new GraphQLError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, {
          extensions: { code: 'INVALID_INPUT' },
        });
      }

      const member = await this.teamService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!member) {
        throw new GraphQLError('Team member not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      this.ensureTenantOwnership(member, context);

      const updated = await this.teamService.update(id, { role });
      return this.transformToGraphQL(updated);
    } catch (error) {
      this.handleServiceError(error, 'updateTeamMemberRole');
    }
  }

  async updateTeamMemberStatus(
    id: string,
    status: string,
    context: AdapterContext,
  ) {
    try {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'PENDING_INVITATION', 'INVITED'];
      if (!validStatuses.includes(status)) {
        throw new GraphQLError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, {
          extensions: { code: 'INVALID_INPUT' },
        });
      }

      const member = await this.teamService.findById(id, {
        where: { tenantId: context.tenantId },
      });

      if (!member) {
        throw new GraphQLError('Team member not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      this.ensureTenantOwnership(member, context);

      const updated = await this.teamService.update(id, { status });
      return this.transformToGraphQL(updated);
    } catch (error) {
      this.handleServiceError(error, 'updateTeamMemberStatus');
    }
  }

  protected transformToGraphQL(data: any): any {
    if (!data) return null;

    return {
      id: data.id,
      tenantId: data.tenantId,
      name: data.name,
      email: data.email,
      role: data.role || 'MEMBER',
      status: data.status || 'ACTIVE',
      avatar: data.avatar || null,
      bio: data.bio || null,
      socialLinks: data.socialLinks || {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  protected transformFromGraphQL(input: Partial<TeamMemberGqlInput>, context: AdapterContext): any {
    const output: any = {};

    if (input.name !== undefined) {
      output.name = input.name.trim();
    }
    if (input.email !== undefined) {
      output.email = input.email.toLowerCase().trim();
    }
    if (input.role !== undefined) {
      output.role = input.role;
    }
    if (input.status !== undefined) {
      output.status = input.status;
    }
    if (input.avatar !== undefined) {
      output.avatar = input.avatar;
    }
    if (input.bio !== undefined) {
      output.bio = input.bio?.trim() || null;
    }
    if (input.socialLinks !== undefined) {
      output.socialLinks = input.socialLinks || {};
    }

    return output;
  }

  private validateCreateInput(input: TeamMemberGqlInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new GraphQLError('Team member name is required', {
        extensions: { code: 'INVALID_INPUT' },
      });
    }

    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new GraphQLError('Valid email address is required', {
        extensions: { code: 'INVALID_INPUT' },
      });
    }

    if (input.name.length > 200) {
      throw new GraphQLError('Name must be less than 200 characters', {
        extensions: { code: 'INVALID_INPUT' },
      });
    }

    if (input.bio && input.bio.length > 1000) {
      throw new GraphQLError('Bio must be less than 1000 characters', {
        extensions: { code: 'INVALID_INPUT' },
      });
    }

    const validRoles = ['LEAD', 'MEMBER', 'CONTRIBUTOR', 'VIEWER'];
    if (input.role && !validRoles.includes(input.role)) {
      throw new GraphQLError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, {
        extensions: { code: 'INVALID_INPUT' },
      });
    }
  }
}
