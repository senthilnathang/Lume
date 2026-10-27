import {
  Controller,
  HttpCode,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ParseIntPipe } from '@core/pipes/parse-int.pipe';
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
  CreateValidationRuleDto,
  UpdateValidationRuleDto,
  CreateAssignmentRuleDto,
  UpdateAssignmentRuleDto,
  CreateRollupFieldDto,
  UpdateRollupFieldDto,
} from '../dtos';

@Controller(['automation', 'base_automation', 'api/automation'])
@UseGuards(JwtAuthGuard, RbacGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AutomationController {
  constructor(private automationService: AutomationService) {}

  // ── Workflows ─────────────────────────────────────────────────

  @Post('workflows/validate')
  @HttpCode(200)
  @Permissions('base_automation.workflows.manage')
  async validateWorkflow(@Body() dto: CreateWorkflowDto) {
    return this.automationService.validateWorkflow(dto);
  }

  @Get('workflows')
  @Permissions('base_automation.workflows')
  async getWorkflows(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getWorkflows({ status, model });
  }

  @Get('workflows/:id')
  @Permissions('base_automation.workflows')
  async getWorkflow(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.getWorkflow(id);
  }

  @Post('workflows')
  @Permissions('base_automation.workflows.manage')
  async createWorkflow(@Body() dto: CreateWorkflowDto) {
    return this.automationService.createWorkflow(dto);
  }

  @Put('workflows/:id')
  @Permissions('base_automation.workflows.manage')
  async updateWorkflow(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWorkflowDto) {
    return this.automationService.updateWorkflow(id, dto);
  }

  @Delete('workflows/:id')
  @Permissions('base_automation.workflows.manage')
  async deleteWorkflow(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.deleteWorkflow(id);
  }

  // ── Flows ─────────────────────────────────────────────────────

  @Get('flows')
  @Permissions('base_automation.flows')
  async getFlows(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getFlows({ status, model });
  }

  @Get('flows/:id')
  @Permissions('base_automation.flows')
  async getFlow(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.getFlow(id);
  }

  @Post('flows')
  @Permissions('base_automation.flows.manage')
  async createFlow(@Body() dto: CreateFlowDto) {
    return this.automationService.createFlow(dto);
  }

  @Put('flows/:id')
  @Permissions('base_automation.flows.manage')
  async updateFlow(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFlowDto) {
    return this.automationService.updateFlow(id, dto);
  }

  @Delete('flows/:id')
  @Permissions('base_automation.flows.manage')
  async deleteFlow(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.deleteFlow(id);
  }

  // ── Business Rules ────────────────────────────────────────────

  @Get('rules')
  @Permissions('base_automation.rules')
  async getBusinessRules(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getBusinessRules({ status, model });
  }

  @Get('rules/:id')
  @Permissions('base_automation.rules')
  async getBusinessRule(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.getBusinessRule(id);
  }

  @Post('rules')
  @Permissions('base_automation.rules.manage')
  async createBusinessRule(@Body() dto: CreateBusinessRuleDto) {
    return this.automationService.createBusinessRule(dto);
  }

  @Put('rules/:id')
  @Permissions('base_automation.rules.manage')
  async updateBusinessRule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBusinessRuleDto) {
    return this.automationService.updateBusinessRule(id, dto);
  }

  @Delete('rules/:id')
  @Permissions('base_automation.rules.manage')
  async deleteBusinessRule(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.deleteBusinessRule(id);
  }

  // ── Approval Chains ───────────────────────────────────────────

  @Get('approvals')
  @Permissions('base_automation.approvals')
  async getApprovalChains(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getApprovalChains({ status, model });
  }

  @Get('approvals/:id')
  @Permissions('base_automation.approvals')
  async getApprovalChain(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.getApprovalChain(id);
  }

  @Post('approvals')
  @Permissions('base_automation.approvals.manage')
  async createApprovalChain(@Body() dto: CreateApprovalChainDto) {
    return this.automationService.createApprovalChain(dto);
  }

  @Put('approvals/:id')
  @Permissions('base_automation.approvals.manage')
  async updateApprovalChain(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateApprovalChainDto) {
    return this.automationService.updateApprovalChain(id, dto);
  }

  @Delete('approvals/:id')
  @Permissions('base_automation.approvals.manage')
  async deleteApprovalChain(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.deleteApprovalChain(id);
  }

  // ── Validation Rules ──────────────────────────────────────────

  @Get('validation-rules')
  @Permissions('base_automation.rules')
  async getValidationRules(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getValidationRules({ status, model });
  }

  @Get('validation-rules/:id')
  @Permissions('base_automation.rules')
  async getValidationRule(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.getValidationRule(id);
  }

  @Post('validation-rules')
  @Permissions('base_automation.rules.manage')
  async createValidationRule(@Body() dto: CreateValidationRuleDto) {
    return this.automationService.createValidationRule(dto);
  }

  @Put('validation-rules/:id')
  @Permissions('base_automation.rules.manage')
  async updateValidationRule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateValidationRuleDto) {
    return this.automationService.updateValidationRule(id, dto);
  }

  @Delete('validation-rules/:id')
  @Permissions('base_automation.rules.manage')
  async deleteValidationRule(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.deleteValidationRule(id);
  }

  // ── Assignment Rules ──────────────────────────────────────────

  @Get('assignment-rules')
  @Permissions('base_automation.rules')
  async getAssignmentRules(@Query('status') status?: string, @Query('model') model?: string) {
    return this.automationService.getAssignmentRules({ status, model });
  }

  @Get('assignment-rules/:id')
  @Permissions('base_automation.rules')
  async getAssignmentRule(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.getAssignmentRule(id);
  }

  @Post('assignment-rules')
  @Permissions('base_automation.rules.manage')
  async createAssignmentRule(@Body() dto: CreateAssignmentRuleDto) {
    return this.automationService.createAssignmentRule(dto);
  }

  @Put('assignment-rules/:id')
  @Permissions('base_automation.rules.manage')
  async updateAssignmentRule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssignmentRuleDto) {
    return this.automationService.updateAssignmentRule(id, dto);
  }

  @Delete('assignment-rules/:id')
  @Permissions('base_automation.rules.manage')
  async deleteAssignmentRule(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.deleteAssignmentRule(id);
  }

  // ── Rollup Fields ─────────────────────────────────────────────

  @Get('rollup-fields')
  @Permissions('base_automation.rules')
  async getRollupFields(@Query('status') status?: string, @Query('parentModel') parentModel?: string) {
    return this.automationService.getRollupFields({ status, parentModel });
  }

  @Get('rollup-fields/:id')
  @Permissions('base_automation.rules')
  async getRollupField(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.getRollupField(id);
  }

  @Post('rollup-fields')
  @Permissions('base_automation.rules.manage')
  async createRollupField(@Body() dto: CreateRollupFieldDto) {
    return this.automationService.createRollupField(dto);
  }

  @Put('rollup-fields/:id')
  @Permissions('base_automation.rules.manage')
  async updateRollupField(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRollupFieldDto) {
    return this.automationService.updateRollupField(id, dto);
  }

  @Delete('rollup-fields/:id')
  @Permissions('base_automation.rules.manage')
  async deleteRollupField(@Param('id', ParseIntPipe) id: number) {
    return this.automationService.deleteRollupField(id);
  }
}
