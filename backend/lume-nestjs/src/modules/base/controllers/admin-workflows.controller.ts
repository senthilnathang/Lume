import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, UseGuards } from '@nestjs/common';
import { MetadataRegistryService } from '../../../core/runtime/metadata-registry.service.js';
import { WorkflowExecutorService } from '../../../core/workflow/workflow-executor.service.js';
import { VersioningService } from '../../../core/versioning/versioning.service.js';
import { PolicyGuard, Policy } from '../../../core/permission/policy.guard.js';

@Controller('admin/workflows')
@UseGuards(PolicyGuard)
export class AdminWorkflowsController {
  constructor(
    private readonly metadataRegistry: MetadataRegistryService,
    private readonly workflowExecutor: WorkflowExecutorService,
    private readonly versioning: VersioningService,
  ) {}

  @Get()
  @Policy(['admin', 'super_admin'])
  async listWorkflows() {
    const workflows = this.metadataRegistry.listWorkflows();
    return {
      success: true,
      data: workflows.map((wf) => ({
        name: wf.name,
        version: wf.version,
        entity: wf.entity,
        trigger: wf.trigger,
        steps: wf.steps?.length || 0,
        onError: wf.onError,
        maxRetries: wf.maxRetries,
      })),
    };
  }

  @Get(':workflowName')
  @Policy(['admin', 'super_admin'])
  async getWorkflow(@Param('workflowName') workflowName: string) {
    const workflow = this.metadataRegistry.getWorkflow(workflowName);
    if (!workflow) {
      return { success: false, message: `Workflow ${workflowName} not found` };
    }
    return { success: true, data: workflow };
  }

  @Post(':workflowName/execute')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async executeWorkflow(
    @Param('workflowName') workflowName: string,
    @Body() body: { recordId: number; data?: Record<string, any> },
  ) {
    try {
      const workflow = this.metadataRegistry.getWorkflow(workflowName);
      if (!workflow) {
        return { success: false, message: `Workflow ${workflowName} not found` };
      }

      const triggerEvent = {
        type: 'manual',
        recordId: body.recordId,
        data: body.data || {},
      };

      const run = await this.workflowExecutor.execute(workflowName, triggerEvent, {
        userId: 1, // TODO: get from request context
        role: 'admin',
      });

      return {
        success: true,
        data: {
          runId: run.id,
          status: run.status,
          stepsLog: run.stepsLog,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('runs/:workflowName')
  @Policy(['admin', 'super_admin'])
  async listWorkflowRuns(@Param('workflowName') workflowName: string) {
    // TODO: Implement workflow runs history query
    return {
      success: true,
      data: {
        workflow: workflowName,
        runs: [], // Should query from DB
      },
    };
  }

  @Get('test/:workflowName')
  @Policy(['admin', 'super_admin'])
  async testWorkflow(
    @Param('workflowName') workflowName: string,
    @Body() body: { sampleData: Record<string, any> },
  ) {
    try {
      const workflow = this.metadataRegistry.getWorkflow(workflowName);
      if (!workflow) {
        return { success: false, message: `Workflow ${workflowName} not found` };
      }

      // Simulate workflow execution with sample data
      const result = {
        workflowName,
        stepsExecuted: workflow.steps.length,
        dryRun: true,
        preview: body.sampleData,
      };

      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('versions/:workflowName')
  @HttpCode(200)
  @Policy(['admin', 'super_admin'])
  async saveWorkflowVersion(
    @Param('workflowName') workflowName: string,
    @Body() body: { note?: string },
  ) {
    try {
      const workflow = this.metadataRegistry.getWorkflow(workflowName);
      if (!workflow) {
        return { success: false, message: `Workflow ${workflowName} not found` };
      }

      await this.versioning.saveWorkflowVersion(workflow, body.note);
      return { success: true, message: 'Workflow version saved' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
