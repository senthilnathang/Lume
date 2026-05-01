import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  Context,
} from '@nestjs/graphql';
import { GraphQLService } from '../graphql.service';
import { AgentGridService } from '../services/agent-grid.service';

interface GraphQLContext {
  userId: string;
  tenantId: string;
  userRoles: string[];
}

@Resolver('AgentGrid')
export class AgentGridResolver {
  constructor(
    private graphqlService: GraphQLService,
    private agentGridService: AgentGridService,
  ) {}

  @Query('agentGrid')
  async getAgentGrid(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('agentGrid', 'query', context, { id });

    if (!this.graphqlService.hasRole(context, ['user'])) {
      throw new Error('Access denied');
    }

    return this.agentGridService.getAgentGrid(id, context.tenantId);
  }

  @Query('agentGrids')
  async listAgentGrids(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('agentGrids', 'query', context, input);

    return this.agentGridService.listAgentGrids(input, context.tenantId);
  }

  @Query('agents')
  async listAgents(
    @Args('gridId') gridId: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('agents', 'query', context, { gridId, input });

    return this.agentGridService.listAgents(gridId, input, context.tenantId);
  }

  @Query('agentExecutions')
  async listExecutions(
    @Args('agentId') agentId: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    return this.agentGridService.listExecutions(agentId, input, context.tenantId);
  }

  @Mutation('executeAgent')
  async executeAgent(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('executeAgent', 'mutation', context, input);

    try {
      const execution = await this.agentGridService.executeAgent(
        input,
        context.tenantId,
        context.userId,
      );

      await this.graphqlService.createAuditLog(
        context.userId,
        'EXECUTE_AGENT',
        'agent',
        input.agentId,
        { input },
      );

      return {
        success: true,
        message: 'Agent execution started',
        errors: [],
        execution,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [{ field: 'agent', message: error.message, code: 'EXECUTION_ERROR' }],
        execution: null,
      };
    }
  }

  @Mutation('cancelExecution')
  async cancelExecution(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ): Promise<boolean> {
    return this.agentGridService.cancelExecution(id, context.tenantId);
  }

  @Subscription('executionUpdated')
  executionUpdated(@Args('executionId') executionId: string) {
    return {
      subscribe: () => ({
        // WebSocket subscription implementation
      }),
    };
  }
}
