import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
} from '@nestjs/graphql';
import { GraphQLService } from '../graphql.service';
import { PolicyGridService } from '../services/policy-grid.service';

interface GraphQLContext {
  userId: string;
  tenantId: string;
  userRoles: string[];
}

@Resolver('PolicyGrid')
export class PolicyGridResolver {
  constructor(
    private graphqlService: GraphQLService,
    private policyGridService: PolicyGridService,
  ) {}

  @Query('policyGrid')
  async getPolicyGrid(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ) {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    return this.policyGridService.getPolicyGrid(id, context.tenantId);
  }

  @Query('policyGrids')
  async listPolicyGrids(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    return this.policyGridService.listPolicyGrids(input, context.tenantId);
  }

  @Query('policies')
  async listPolicies(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    return this.policyGridService.listPolicies(input, context.tenantId);
  }

  @Query('checkAccess')
  async checkAccess(
    @Args('userId') userId: string,
    @Args('resource') resource: string,
    @Args('action') action: string,
    @Context() context: GraphQLContext,
  ) {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    return this.policyGridService.checkAccess(userId, resource, action, context.tenantId);
  }

  @Mutation('createPolicy')
  async createPolicy(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    try {
      const policy = await this.policyGridService.createPolicy(
        input,
        context.tenantId,
        context.userId,
      );

      await this.graphqlService.createAuditLog(
        context.userId,
        'CREATE_POLICY',
        'policy',
        policy.id,
        { input },
      );

      return {
        success: true,
        message: 'Policy created successfully',
        errors: [],
        policy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [{ field: 'policy', message: error.message, code: 'VALIDATION_ERROR' }],
        policy: null,
      };
    }
  }

  @Mutation('updatePolicy')
  async updatePolicy(
    @Args('id') id: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    try {
      const policy = await this.policyGridService.updatePolicy(
        id,
        input,
        context.tenantId,
        context.userId,
      );

      await this.graphqlService.createAuditLog(
        context.userId,
        'UPDATE_POLICY',
        'policy',
        id,
        { input },
      );

      return {
        success: true,
        message: 'Policy updated successfully',
        errors: [],
        policy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [{ field: 'policy', message: error.message, code: 'UPDATE_ERROR' }],
        policy: null,
      };
    }
  }

  @Mutation('deletePolicy')
  async deletePolicy(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ): Promise<boolean> {
    if (!this.graphqlService.hasRole(context, ['admin'])) {
      throw new Error('Access denied');
    }

    const deleted = await this.policyGridService.deletePolicy(id, context.tenantId);

    await this.graphqlService.createAuditLog(
      context.userId,
      'DELETE_POLICY',
      'policy',
      id,
      {},
    );

    return deleted;
  }
}
