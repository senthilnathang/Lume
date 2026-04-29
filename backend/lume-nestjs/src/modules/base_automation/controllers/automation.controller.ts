import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Permissions } from '@core/decorators';
import { AutomationService } from '../services/automation.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateFlowDto,
  UpdateFlowDto,
  CreateBusinessRuleDto,
  UpdateBusinessRuleDto,
  CreateApprovalChainDto,
  UpdateApprovalChainDto,
  CreateScheduledActionDto,
  UpdateScheduledActionDto,
  CreateValidationRuleDto,
  UpdateValidationRuleDto,
  CreateAssignmentRuleDto,
  UpdateAssignmentRuleDto,
  CreateRollupFieldDto,
  UpdateRollupFieldDto,
} from '../dtos';

@Controller('api/automation')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AutomationController {
  constructor(private automationService: AutomationService) {}

  // ── Workflows ─────────────────────────────────────────────────

  @Get('workflows')
  @Permissions('base_automation.workflows')
  async getWorkflows(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getWorkflows({ status, model });
  }

  @Get('workflows/:id')
  @Permissions('base_automation.workflows')
  async getWorkflow(@Param('id') id: string) {
    return this.automationService.getWorkflow(parseInt(id, 10));
  }

  @Post('workflows')
  @Permissions('base_automation.workflows.manage')
  async createWorkflow(@Body() dto: CreateWorkflowDto) {
    return this.automationService.createWorkflow(dto);
  }

  @Put('workflows/:id')
  @Permissions('base_automation.workflows.manage')
  async updateWorkflow(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.automationService.updateWorkflow(parseInt(id, 10), dto);
  }

  @Delete('workflows/:id')
  @Permissions('base_automation.workflows.manage')
  async deleteWorkflow(@Param('id') id: string) {
    return this.automationService.deleteWorkflow(parseInt(id, 10));
  }

  // ── Flows ─────────────────────────────────────────────────────

  @Get('flows')
  @Permissions('base_automation.flows')
  async getFlows(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getFlows({ status, model });
  }

  @Get('flows/:id')
  @Permissions('base_automation.flows')
  async getFlow(@Param('id') id: string) {
    return this.automationService.getFlow(parseInt(id, 10));
  }

  @Post('flows')
  @Permissions('base_automation.flows.manage')
  async createFlow(@Body() dto: CreateFlowDto) {
    return this.automationService.createFlow(dto);
  }

  @Put('flows/:id')
  @Permissions('base_automation.flows.manage')
  async updateFlow(@Param('id') id: string, @Body() dto: UpdateFlowDto) {
    return this.automationService.updateFlow(parseInt(id, 10), dto);
  }

  @Delete('flows/:id')
  @Permissions('base_automation.flows.manage')
  async deleteFlow(@Param('id') id: string) {
    return this.automationService.deleteFlow(parseInt(id, 10));
  }

  // ── Business Rules ────────────────────────────────────────────

  @Get('rules')
  @Permissions('base_automation.rules')
  async getBusinessRules(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getBusinessRules({ status, model });
  }

  @Get('rules/:id')
  @Permissions('base_automation.rules')
  async getBusinessRule(@Param('id') id: string) {
    return this.automationService.getBusinessRule(parseInt(id, 10));
  }

  @Post('rules')
  @Permissions('base_automation.rules.manage')
  async createBusinessRule(@Body() dto: CreateBusinessRuleDto) {
    return this.automationService.createBusinessRule(dto);
  }

  @Put('rules/:id')
  @Permissions('base_automation.rules.manage')
  async updateBusinessRule(@Param('id') id: string, @Body() dto: UpdateBusinessRuleDto) {
    return this.automationService.updateBusinessRule(parseInt(id, 10), dto);
  }

  @Delete('rules/:id')
  @Permissions('base_automation.rules.manage')
  async deleteBusinessRule(@Param('id') id: string) {
    return this.automationService.deleteBusinessRule(parseInt(id, 10));
  }

  // ── Approval Chains ───────────────────────────────────────────

  @Get('approvals')
  @Permissions('base_automation.approvals')
  async getApprovalChains(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getApprovalChains({ status, model });
  }

  @Get('approvals/:id')
  @Permissions('base_automation.approvals')
  async getApprovalChain(@Param('id') id: string) {
    return this.automationService.getApprovalChain(parseInt(id, 10));
  }

  @Post('approvals')
  @Permissions('base_automation.approvals.manage')
  async createApprovalChain(@Body() dto: CreateApprovalChainDto) {
    return this.automationService.createApprovalChain(dto);
  }

  @Put('approvals/:id')
  @Permissions('base_automation.approvals.manage')
  async updateApprovalChain(@Param('id') id: string, @Body() dto: UpdateApprovalChainDto) {
    return this.automationService.updateApprovalChain(parseInt(id, 10), dto);
  }

  @Delete('approvals/:id')
  @Permissions('base_automation.approvals.manage')
  async deleteApprovalChain(@Param('id') id: string) {
    return this.automationService.deleteApprovalChain(parseInt(id, 10));
  }

  // ── Scheduled Actions ─────────────────────────────────────────

  @Get('scheduled')
  @Permissions('base_automation.scheduled')
  async getScheduledActions(@Query('status') status?: string) {
    return this.automationService.getScheduledActions({ status });
  }

  @Get('scheduled/:id')
  @Permissions('base_automation.scheduled')
  async getScheduledAction(@Param('id') id: string) {
    return this.automationService.getScheduledAction(parseInt(id, 10));
  }

  @Post('scheduled')
  @Permissions('base_automation.scheduled.manage')
  async createScheduledAction(@Body() dto: CreateScheduledActionDto) {
    return this.automationService.createScheduledAction(dto);
  }

  @Put('scheduled/:id')
  @Permissions('base_automation.scheduled.manage')
  async updateScheduledAction(@Param('id') id: string, @Body() dto: UpdateScheduledActionDto) {
    return this.automationService.updateScheduledAction(parseInt(id, 10), dto);
  }

  @Delete('scheduled/:id')
  @Permissions('base_automation.scheduled.manage')
  async deleteScheduledAction(@Param('id') id: string) {
    return this.automationService.deleteScheduledAction(parseInt(id, 10));
  }

  // ── Validation Rules ──────────────────────────────────────────

  @Get('validation-rules')
  @Permissions('base_automation.rules')
  async getValidationRules(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getValidationRules({ status, model });
  }

  @Get('validation-rules/:id')
  @Permissions('base_automation.rules')
  async getValidationRule(@Param('id') id: string) {
    return this.automationService.getValidationRule(parseInt(id, 10));
  }

  @Post('validation-rules')
  @Permissions('base_automation.rules.manage')
  async createValidationRule(@Body() dto: CreateValidationRuleDto) {
    return this.automationService.createValidationRule(dto);
  }

  @Put('validation-rules/:id')
  @Permissions('base_automation.rules.manage')
  async updateValidationRule(@Param('id') id: string, @Body() dto: UpdateValidationRuleDto) {
    return this.automationService.updateValidationRule(parseInt(id, 10), dto);
  }

  @Delete('validation-rules/:id')
  @Permissions('base_automation.rules.manage')
  async deleteValidationRule(@Param('id') id: string) {
    return this.automationService.deleteValidationRule(parseInt(id, 10));
  }

  // ── Assignment Rules ──────────────────────────────────────────

  @Get('assignment-rules')
  @Permissions('base_automation.rules')
  async getAssignmentRules(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getAssignmentRules({ status, model });
  }

  @Get('assignment-rules/:id')
  @Permissions('base_automation.rules')
  async getAssignmentRule(@Param('id') id: string) {
    return this.automationService.getAssignmentRule(parseInt(id, 10));
  }

  @Post('assignment-rules')
  @Permissions('base_automation.rules.manage')
  async createAssignmentRule(@Body() dto: CreateAssignmentRuleDto) {
    return this.automationService.createAssignmentRule(dto);
  }

  @Put('assignment-rules/:id')
  @Permissions('base_automation.rules.manage')
  async updateAssignmentRule(@Param('id') id: string, @Body() dto: UpdateAssignmentRuleDto) {
    return this.automationService.updateAssignmentRule(parseInt(id, 10), dto);
  }

  @Delete('assignment-rules/:id')
  @Permissions('base_automation.rules.manage')
  async deleteAssignmentRule(@Param('id') id: string) {
    return this.automationService.deleteAssignmentRule(parseInt(id, 10));
  }

  // ── Rollup Fields ─────────────────────────────────────────────

  @Get('rollup-fields')
  @Permissions('base_automation.rules')
  async getRollupFields(@Query('status') status?: string, @Query('parentModel') parentModel?: string) {
    return this.automationService.getRollupFields({ status, parentModel });
  }

  @Get('rollup-fields/:id')
  @Permissions('base_automation.rules')
  async getRollupField(@Param('id') id: string) {
    return this.automationService.getRollupField(parseInt(id, 10));
  }

  @Post('rollup-fields')
  @Permissions('base_automation.rules.manage')
  async createRollupField(@Body() dto: CreateRollupFieldDto) {
    return this.automationService.createRollupField(dto);
  }

  @Put('rollup-fields/:id')
  @Permissions('base_automation.rules.manage')
  async updateRollupField(@Param('id') id: string, @Body() dto: UpdateRollupFieldDto) {
    return this.automationService.updateRollupField(parseInt(id, 10), dto);
  }

  @Delete('rollup-fields/:id')
  @Permissions('base_automation.rules.manage')
  async deleteRollupField(@Param('id') id: string) {
    return this.automationService.deleteRollupField(parseInt(id, 10));
  }
}
