import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  Context,
} from '@nestjs/graphql';
import { GraphQLService } from '../graphql.service';
import { FlowGridService } from '../services/flow-grid.service';

interface GraphQLContext {
  userId: string;
  tenantId: string;
  userRoles: string[];
}

@Resolver('FlowGrid')
export class FlowGridResolver {
  constructor(
    private graphqlService: GraphQLService,
    private flowGridService: FlowGridService,
  ) {}

  @Query('flowGrid')
  async getFlowGrid(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('flowGrid', 'query', context, { id });

    if (!this.graphqlService.hasRole(context, ['user'])) {
      throw new Error('Access denied');
    }

    return this.flowGridService.getFlowGrid(id, context.tenantId);
  }

  @Query('flowGrids')
  async listFlowGrids(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    return this.flowGridService.listFlowGrids(input, context.tenantId);
  }

  @Query('workflows')
  async listWorkflows(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    return this.flowGridService.listWorkflows(input, context.tenantId);
  }

  @Query('workflowExecutions')
  async listExecutions(
    @Args('workflowId') workflowId: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    return this.flowGridService.listExecutions(workflowId, input, context.tenantId);
  }

  @Mutation('createWorkflow')
  async createWorkflow(
    @Args('gridId') gridId: string,
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('createWorkflow', 'mutation', context, input);

    try {
      const workflow = await this.flowGridService.createWorkflow(
        gridId,
        input,
        context.tenantId,
        context.userId,
      );

      await this.graphqlService.createAuditLog(
        context.userId,
        'CREATE_WORKFLOW',
        'workflow',
        workflow.id,
        { input },
      );

      return workflow;
    } catch (error) {
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  }

  @Mutation('publishWorkflow')
  async publishWorkflow(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ) {
    try {
      const workflow = await this.flowGridService.publishWorkflow(id, context.tenantId);

      await this.graphqlService.createAuditLog(
        context.userId,
        'PUBLISH_WORKFLOW',
        'workflow',
        id,
        {},
      );

      return workflow;
    } catch (error) {
      throw new Error(`Failed to publish workflow: ${error.message}`);
    }
  }

  @Mutation('executeWorkflow')
  async executeWorkflow(
    @Args('input') input: any,
    @Context() context: GraphQLContext,
  ) {
    this.graphqlService.logOperation('executeWorkflow', 'mutation', context, input);

    try {
      const execution = await this.flowGridService.executeWorkflow(
        input,
        context.tenantId,
        context.userId,
      );

      await this.graphqlService.createAuditLog(
        context.userId,
        'EXECUTE_WORKFLOW',
        'workflow',
        input.workflowId,
        { input },
      );

      return {
        success: true,
        message: 'Workflow execution started',
        errors: [],
        execution,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        errors: [{ field: 'workflow', message: error.message, code: 'EXECUTION_ERROR' }],
        execution: null,
      };
    }
  }

  @Mutation('cancelExecution')
  async cancelExecution(
    @Args('id') id: string,
    @Context() context: GraphQLContext,
  ): Promise<boolean> {
    return this.flowGridService.cancelExecution(id, context.tenantId);
  }

  @Subscription('workflowExecutionUpdated')
  workflowExecutionUpdated(@Args('executionId') executionId: string) {
    return {
      subscribe: () => ({
        // WebSocket subscription implementation
      }),
    };
  }
}
