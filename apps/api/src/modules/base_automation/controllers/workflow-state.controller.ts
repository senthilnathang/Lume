import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, Param, ParseIntPipe, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { resolveTenant } from '../../../graphql/tenant';
import { WorkflowStateEngineService } from '../services/workflow-state-engine.service';

class TransitionExecutionDto {
  @IsString() @IsNotEmpty() @MaxLength(100) transitionCode: string;
  @IsInt() @Min(0) version: number;
}

@Controller(['automation/workflows', 'base_automation/workflows'])
@UseGuards(JwtAuthGuard, RbacGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class WorkflowStateController {
  constructor(private readonly engine: WorkflowStateEngineService) {}
  private context(req: any) {
    const companyId = resolveTenant(req), userId = req.user?.id;
    if (!companyId || !Number.isSafeInteger(userId) || userId < 1) throw new ForbiddenException('Actor and company required');
    return { companyId, userId };
  }
  @Post(':workflowId/run/:recordId')
  @Permissions('base_automation.workflows.manage')
  async start(@Param('workflowId', ParseIntPipe) workflowId: number, @Param('recordId', ParseIntPipe) recordId: number, @Body() body: Record<string, unknown>, @Req() req: any) {
    if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).length) throw new BadRequestException('Start requires an empty object');
    return { success: true, data: await this.engine.start(workflowId, recordId, this.context(req)) };
  }
  @Get(':workflowId/executions/:id')
  @Permissions('base_automation.workflows')
  async get(@Param('workflowId', ParseIntPipe) workflowId: number, @Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return { success: true, data: await this.engine.get(workflowId, id, this.context(req)) };
  }
  @Post(':workflowId/executions/:id/transition')
  @HttpCode(200)
  @Permissions('base_automation.workflows.manage')
  async transition(@Param('workflowId', ParseIntPipe) workflowId: number, @Param('id', ParseIntPipe) id: number, @Body() input: TransitionExecutionDto, @Req() req: any) {
    return { success: true, data: await this.engine.transition(workflowId, id, input, this.context(req)) };
  }
  @Post(':workflowId/executions/:id/approval')
  @Permissions('base_automation.workflows.manage', 'base_automation.approvals')
  async requestApproval(@Param('workflowId', ParseIntPipe) workflowId: number, @Param('id', ParseIntPipe) id: number, @Body() input: TransitionExecutionDto, @Req() req: any) {
    return { success: true, data: await this.engine.requestApproval(workflowId, id, input, this.context(req)) };
  }
}
