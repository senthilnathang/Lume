import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, UseGuards, Req } from '@nestjs/common';
import { MetadataRegistryService } from '../../../core/runtime/metadata-registry.service.js';
import { WorkflowExecutorService } from '../../../core/workflow/workflow-executor.service.js';
import { VersioningService } from '../../../core/versioning/versioning.service.js';
import { PolicyGuard, RequireRoles } from '../../../core/permission/policy.guard.js';
import { resolveTenant } from '../../../graphql/tenant';
import { PrismaService } from '../../../core/services/prisma.service';
import { RecordService } from '../services/record.service';
import { FieldPermissionService } from '../services/field-permission.service';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

@Controller('admin/workflows')
@UseGuards(JwtAuthGuard, PolicyGuard)
export class AdminWorkflowsController {
  constructor(
    private readonly metadataRegistry: MetadataRegistryService,
    private readonly workflowExecutor: WorkflowExecutorService,
    private readonly versioning: VersioningService,
    private readonly prisma: PrismaService,
    private readonly records: RecordService,
  ) {}

  @Get()
  @RequireRoles('admin', 'super_admin')
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
  @RequireRoles('admin', 'super_admin')
  async getWorkflow(@Param('workflowName') workflowName: string) {
    const workflow = this.metadataRegistry.getWorkflow(workflowName);
    if (!workflow) {
      return { success: false, message: `Workflow ${workflowName} not found` };
    }
    return { success: true, data: workflow };
  }

  @Post(':workflowName/execute')
  @HttpCode(200)
  @RequireRoles('admin', 'super_admin')
  async executeWorkflow(
    @Param('workflowName') workflowName: string,
    @Body() body: { recordId: number; data?: Record<string, any> },
    @Req() req: any,
  ) {
    try {
      const workflow = this.metadataRegistry.getWorkflow(workflowName);
      if (!workflow) {
        return { success: false, message: `Workflow ${workflowName} not found` };
      }

      const companyId = resolveTenant(req);
      const userId = req.user.sub ?? req.user.id;
      if (!companyId || !Number.isSafeInteger(body.recordId) || body.recordId < 1) throw new Error('Tenant and valid record ID required');
      const entity = await this.prisma.entity.findFirst({where:{name:workflow.entity,deletedAt:null}});
      const record = entity && await this.records.getRecord(body.recordId,companyId,userId,entity.id);
      if (!record) throw new Error('Workflow record not found or inaccessible');
      const user = await this.prisma.user.findUnique({where:{id:userId}});
      record.data = await new FieldPermissionService(this.prisma).filterRecordForRole(entity.id,record.data,user.role_id);
      const triggerEvent = {
        type: 'manual',
        recordId: body.recordId,
      };

      const run = await this.prisma.automationJob.create({data:{
        eventKey:`manual:${randomUUID()}`,kind:'workflow',companyId,userId,
        payload:JSON.stringify({workflowName,entityId:entity.id,recordId:record.id,definition:workflow}),
      }});

      return {
        success: true,
        data: {
          runId: run.id,
          status: run.status,
          queued: true,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('runs/:workflowName')
  @RequireRoles('admin', 'super_admin')
  async listWorkflowRuns(@Param('workflowName') workflowName: string, @Req() req:any) {
    const companyId=resolveTenant(req);
    if(!companyId)throw new Error('Tenant required');
    const runs=await this.prisma.$queryRaw(Prisma.sql`SELECT id,status,attempts,last_error AS lastError,result,created_at AS createdAt
      FROM automation_jobs WHERE company_id=${companyId} AND kind='workflow'
      AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.workflowName'))=${workflowName} ORDER BY id DESC LIMIT 50`);
    return {
      success: true,
      data: {
        workflow: workflowName,
        runs,
      },
    };
  }

  @Get('jobs/list')
  @RequireRoles('admin','super_admin')
  async listJobs(@Req() req:any){
    const companyId=resolveTenant(req);if(!companyId)throw new Error('Tenant required');
    return {success:true,data:await this.prisma.automationJob.findMany({where:{companyId},orderBy:{id:'desc'},take:100,
      select:{id:true,kind:true,status:true,attempts:true,lastError:true,createdAt:true,availableAt:true}})};
  }

  @Post('jobs/:jobId/retry')
  @HttpCode(200)
  @RequireRoles('admin','super_admin')
  async retryJob(@Param('jobId') raw:string,@Req() req:any){
    const companyId=resolveTenant(req),id=Number(raw);
    if(!companyId||!Number.isSafeInteger(id)||id<1)throw new Error('Tenant and job ID required');
    const result=await this.prisma.automationJob.updateMany({where:{id,companyId,status:'failed'},data:{status:'retry',attempts:0,availableAt:new Date(),lastError:null}});
    return {success:result.count===1};
  }

  @Get('test/:workflowName')
  @RequireRoles('admin', 'super_admin')
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
  @RequireRoles('admin', 'super_admin')
  async saveWorkflowVersion(
    @Param('workflowName') workflowName: string,
    @Body() body: { note?: string },
  ) {
    try {
      const workflow = this.metadataRegistry.getWorkflow(workflowName);
      if (!workflow) {
        return { success: false, message: `Workflow ${workflowName} not found` };
      }

      await this.versioning.saveWorkflowVersion(workflowName, workflow, body.note);
      return { success: true, message: 'Workflow version saved' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
