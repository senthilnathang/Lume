import { workflowDefinitionErrors } from './workflow-definition-validation';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import {
  automationWorkflows,
  automationFlows,
  automationBusinessRules,
  automationApprovalChains,
  automationScheduledActions,
  automationValidationRules,
  automationAssignmentRules,
  automationRollupFields,
} from '../models/schema';
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
import { and, eq } from 'drizzle-orm';

@Injectable()
export class AutomationService {
  private db: any;

  constructor(private drizzle: DrizzleService) {
    this.db = drizzle.getDrizzle();
  }

  // ── Workflows ─────────────────────────────────────────────────

  async getWorkflows(filters?: { status?: string; model?: string }) {
    let query = this.db.select().from(automationWorkflows);

    const conditions = [];
    if (filters?.status) conditions.push(eq(automationWorkflows.status, filters.status));
    if (filters?.model) conditions.push(eq(automationWorkflows.model, filters.model));
    if (conditions.length) query = query.where(and(...conditions));

    const results = await query;
    return { success: true, data: results };
  }

  async getWorkflow(id: number) {
    const result = await this.db
      .select()
      .from(automationWorkflows)
      .where(eq(automationWorkflows.id, id));

    if (!result.length) {
      return { success: false, error: 'Workflow not found' };
    }

    return { success: true, data: result[0] };
  }

  validateWorkflow(dto: CreateWorkflowDto) {
    const errors = workflowDefinitionErrors(dto);
    if (errors.length) throw new BadRequestException({ message: 'Workflow validation failed', errors });
    return { success: true, data: { errors: [] } };
  }

  async createWorkflow(dto: CreateWorkflowDto) {
    if (dto.status === 'active') this.validateWorkflow(dto);
    try {
      const result = await this.db.insert(automationWorkflows).values(dto);
      return { success: true, data: { ...dto, id: (Array.isArray(result) ? result[0] : result).insertId } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateWorkflow(id: number, dto: UpdateWorkflowDto) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(automationWorkflows)
        .where(eq(automationWorkflows.id, id)).for('update');
      if (!current) throw new NotFoundException('Workflow not found');
      const updates = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
      const merged = { ...current, ...updates };
      if (merged.status === 'active') this.validateWorkflow(merged);
      if (Object.keys(updates).length) await tx.update(automationWorkflows).set(updates).where(eq(automationWorkflows.id, id));
      const [saved] = await tx.select().from(automationWorkflows).where(eq(automationWorkflows.id, id));
      return { success: true, data: saved };
    });
  }

  async deleteWorkflow(id: number) {
    try {
      const result = await this.db
        .select()
        .from(automationWorkflows)
        .where(eq(automationWorkflows.id, id));

      if (!result.length) {
        return { success: false, error: 'Workflow not found' };
      }

      await this.db
        .delete(automationWorkflows)
        .where(eq(automationWorkflows.id, id));

      return { success: true, message: 'Workflow deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Flows ─────────────────────────────────────────────────────

  async getFlows(filters?: { status?: string; model?: string }) {
    let query = this.db.select().from(automationFlows);

    const conditions = [];
    if (filters?.status) conditions.push(eq(automationFlows.status, filters.status));
    if (filters?.model) conditions.push(eq(automationFlows.model, filters.model));
    if (conditions.length) query = query.where(and(...conditions));

    const results = await query;
    return { success: true, data: results };
  }

  async getFlow(id: number) {
    const result = await this.db
      .select()
      .from(automationFlows)
      .where(eq(automationFlows.id, id));

    if (!result.length) {
      return { success: false, error: 'Flow not found' };
    }

    return { success: true, data: result[0] };
  }

  async createFlow(dto: CreateFlowDto) {
    try {
      const result = await this.db.insert(automationFlows).values(dto);
      return { success: true, data: { ...dto, id: (Array.isArray(result) ? result[0] : result).insertId } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateFlow(id: number, dto: UpdateFlowDto) {
    try {
      await this.db
        .update(automationFlows)
        .set(dto)
        .where(eq(automationFlows.id, id));

      const result = await this.db
        .select()
        .from(automationFlows)
        .where(eq(automationFlows.id, id));

      if (!result.length) {
        return { success: false, error: 'Flow not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteFlow(id: number) {
    try {
      const result = await this.db
        .select()
        .from(automationFlows)
        .where(eq(automationFlows.id, id));

      if (!result.length) {
        return { success: false, error: 'Flow not found' };
      }

      await this.db.delete(automationFlows).where(eq(automationFlows.id, id));

      return { success: true, message: 'Flow deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Business Rules ────────────────────────────────────────────

  async getBusinessRules(filters?: { status?: string; model?: string }) {
    let query = this.db.select().from(automationBusinessRules);

    const conditions = [];
    if (filters?.status) conditions.push(eq(automationBusinessRules.status, filters.status));
    if (filters?.model) conditions.push(eq(automationBusinessRules.model, filters.model));
    if (conditions.length) query = query.where(and(...conditions));

    const results = await query;
    return { success: true, data: results };
  }

  async getBusinessRule(id: number) {
    const result = await this.db
      .select()
      .from(automationBusinessRules)
      .where(eq(automationBusinessRules.id, id));

    if (!result.length) {
      return { success: false, error: 'Business rule not found' };
    }

    return { success: true, data: result[0] };
  }

  async createBusinessRule(dto: CreateBusinessRuleDto) {
    try {
      const result = await this.db.insert(automationBusinessRules).values(dto);
      return { success: true, data: { ...dto, id: (Array.isArray(result) ? result[0] : result).insertId } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateBusinessRule(id: number, dto: UpdateBusinessRuleDto) {
    try {
      await this.db
        .update(automationBusinessRules)
        .set(dto)
        .where(eq(automationBusinessRules.id, id));

      const result = await this.db
        .select()
        .from(automationBusinessRules)
        .where(eq(automationBusinessRules.id, id));

      if (!result.length) {
        return { success: false, error: 'Business rule not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteBusinessRule(id: number) {
    try {
      const result = await this.db
        .select()
        .from(automationBusinessRules)
        .where(eq(automationBusinessRules.id, id));

      if (!result.length) {
        return { success: false, error: 'Business rule not found' };
      }

      await this.db
        .delete(automationBusinessRules)
        .where(eq(automationBusinessRules.id, id));

      return { success: true, message: 'Business rule deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Approval Chains ───────────────────────────────────────────

  async getApprovalChains(filters?: { status?: string; model?: string }) {
    const conditions = [];
    if (filters?.status) conditions.push(eq(automationApprovalChains.status,filters.status));
    if (filters?.model) conditions.push(eq(automationApprovalChains.model,filters.model));
    const results = await this.db.select().from(automationApprovalChains).where(and(...conditions));
    return { success: true, data: results };
  }

  async getApprovalChain(id: number) {
    const result = await this.db
      .select()
      .from(automationApprovalChains)
      .where(eq(automationApprovalChains.id, id));

    if (!result.length) {
      return { success: false, error: 'Approval chain not found' };
    }

    return { success: true, data: result[0] };
  }

  async createApprovalChain(dto: CreateApprovalChainDto) {
    this.validateApprovalWorkflows(dto);
    this.validateApprovalTrigger(dto.triggerEvent);
    try {
      const result = await this.db
        .insert(automationApprovalChains)
        .values(dto);
      return this.getApprovalChain(Number(result[0].insertId));
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private validateApprovalWorkflows(dto: {onCompleted?: string | null;onRejected?: string | null}) {
    for (const name of [dto.onCompleted,dto.onRejected]) {
      if (name != null && (typeof name !== 'string' || !/^[a-zA-Z0-9_.-]{1,100}$/.test(name))) throw new BadRequestException('Invalid approval workflow name');
    }
  }

  async updateApprovalChain(id: number, dto: UpdateApprovalChainDto) {
    this.validateApprovalWorkflows(dto);
    this.validateApprovalTrigger(dto.triggerEvent);
    try {
      await this.db
        .update(automationApprovalChains)
        .set(dto)
        .where(eq(automationApprovalChains.id, id));

      const result = await this.db
        .select()
        .from(automationApprovalChains)
        .where(eq(automationApprovalChains.id, id));

      if (!result.length) {
        return { success: false, error: 'Approval chain not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteApprovalChain(id: number) {
    try {
      const result = await this.db
        .select()
        .from(automationApprovalChains)
        .where(eq(automationApprovalChains.id, id));

      if (!result.length) {
        return { success: false, error: 'Approval chain not found' };
      }

      await this.db
        .delete(automationApprovalChains)
        .where(eq(automationApprovalChains.id, id));

      return { success: true, message: 'Approval chain deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private validateApprovalTrigger(trigger: unknown) {
    if (trigger !== undefined && !['manual','record.created','record.updated','record.saved'].includes(trigger as string)) {
      throw new BadRequestException('Invalid approval trigger event');
    }
  }

  // ── Scheduled Actions ─────────────────────────────────────────

  async getScheduledActions(filters?: { status?: string }) {
    let query = this.db.select().from(automationScheduledActions);

    if (filters?.status) {
      query = query.where(eq(automationScheduledActions.status, filters.status));
    }

    const results = await query;
    return { success: true, data: results };
  }

  async getScheduledAction(id: number) {
    const result = await this.db
      .select()
      .from(automationScheduledActions)
      .where(eq(automationScheduledActions.id, id));

    if (!result.length) {
      return { success: false, error: 'Scheduled action not found' };
    }

    return { success: true, data: result[0] };
  }

  async createScheduledAction(dto: CreateScheduledActionDto) {
    try {
      const result = await this.db
        .insert(automationScheduledActions)
        .values(dto);
      return { success: true, data: { ...dto, id: (Array.isArray(result) ? result[0] : result).insertId } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateScheduledAction(id: number, dto: UpdateScheduledActionDto) {
    try {
      await this.db
        .update(automationScheduledActions)
        .set(dto)
        .where(eq(automationScheduledActions.id, id));

      const result = await this.db
        .select()
        .from(automationScheduledActions)
        .where(eq(automationScheduledActions.id, id));

      if (!result.length) {
        return { success: false, error: 'Scheduled action not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteScheduledAction(id: number) {
    try {
      const result = await this.db
        .select()
        .from(automationScheduledActions)
        .where(eq(automationScheduledActions.id, id));

      if (!result.length) {
        return { success: false, error: 'Scheduled action not found' };
      }

      await this.db
        .delete(automationScheduledActions)
        .where(eq(automationScheduledActions.id, id));

      return { success: true, message: 'Scheduled action deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Validation Rules ──────────────────────────────────────────

  async getValidationRules(filters?: { status?: string; model?: string }) {
    let query = this.db.select().from(automationValidationRules);

    const conditions = [];
    if (filters?.status) conditions.push(eq(automationValidationRules.status, filters.status));
    if (filters?.model) conditions.push(eq(automationValidationRules.model, filters.model));
    if (conditions.length) query = query.where(and(...conditions));

    const results = await query;
    return { success: true, data: results };
  }

  async getValidationRule(id: number) {
    const result = await this.db
      .select()
      .from(automationValidationRules)
      .where(eq(automationValidationRules.id, id));

    if (!result.length) {
      return { success: false, error: 'Validation rule not found' };
    }

    return { success: true, data: result[0] };
  }

  async createValidationRule(dto: CreateValidationRuleDto) {
    try {
      const result = await this.db
        .insert(automationValidationRules)
        .values(dto);
      return { success: true, data: { ...dto, id: (Array.isArray(result) ? result[0] : result).insertId } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateValidationRule(id: number, dto: UpdateValidationRuleDto) {
    try {
      await this.db
        .update(automationValidationRules)
        .set(dto)
        .where(eq(automationValidationRules.id, id));

      const result = await this.db
        .select()
        .from(automationValidationRules)
        .where(eq(automationValidationRules.id, id));

      if (!result.length) {
        return { success: false, error: 'Validation rule not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteValidationRule(id: number) {
    try {
      const result = await this.db
        .select()
        .from(automationValidationRules)
        .where(eq(automationValidationRules.id, id));

      if (!result.length) {
        return { success: false, error: 'Validation rule not found' };
      }

      await this.db
        .delete(automationValidationRules)
        .where(eq(automationValidationRules.id, id));

      return { success: true, message: 'Validation rule deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Assignment Rules ──────────────────────────────────────────

  async getAssignmentRules(filters?: { status?: string; model?: string }) {
    let query = this.db.select().from(automationAssignmentRules);

    const conditions = [];
    if (filters?.status) conditions.push(eq(automationAssignmentRules.status, filters.status));
    if (filters?.model) conditions.push(eq(automationAssignmentRules.model, filters.model));
    if (conditions.length) query = query.where(and(...conditions));

    const results = await query;
    return { success: true, data: results };
  }

  async getAssignmentRule(id: number) {
    const result = await this.db
      .select()
      .from(automationAssignmentRules)
      .where(eq(automationAssignmentRules.id, id));

    if (!result.length) {
      return { success: false, error: 'Assignment rule not found' };
    }

    return { success: true, data: result[0] };
  }

  async createAssignmentRule(dto: CreateAssignmentRuleDto) {
    try {
      const result = await this.db
        .insert(automationAssignmentRules)
        .values(dto);
      return { success: true, data: { ...dto, id: (Array.isArray(result) ? result[0] : result).insertId } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateAssignmentRule(id: number, dto: UpdateAssignmentRuleDto) {
    try {
      await this.db
        .update(automationAssignmentRules)
        .set(dto)
        .where(eq(automationAssignmentRules.id, id));

      const result = await this.db
        .select()
        .from(automationAssignmentRules)
        .where(eq(automationAssignmentRules.id, id));

      if (!result.length) {
        return { success: false, error: 'Assignment rule not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteAssignmentRule(id: number) {
    try {
      const result = await this.db
        .select()
        .from(automationAssignmentRules)
        .where(eq(automationAssignmentRules.id, id));

      if (!result.length) {
        return { success: false, error: 'Assignment rule not found' };
      }

      await this.db
        .delete(automationAssignmentRules)
        .where(eq(automationAssignmentRules.id, id));

      return { success: true, message: 'Assignment rule deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Rollup Fields ─────────────────────────────────────────────

  async getRollupFields(filters?: {
    status?: string;
    parentModel?: string;
  }) {
    let query = this.db.select().from(automationRollupFields);

    if (filters?.status) {
      query = query.where(eq(automationRollupFields.status, filters.status));
    }
    if (filters?.parentModel) {
      query = query.where(
        eq(automationRollupFields.parentModel, filters.parentModel)
      );
    }

    const results = await query;
    return { success: true, data: results };
  }

  async getRollupField(id: number) {
    const result = await this.db
      .select()
      .from(automationRollupFields)
      .where(eq(automationRollupFields.id, id));

    if (!result.length) {
      return { success: false, error: 'Rollup field not found' };
    }

    return { success: true, data: result[0] };
  }

  async createRollupField(dto: CreateRollupFieldDto) {
    try {
      const result = await this.db.insert(automationRollupFields).values(dto);
      return { success: true, data: { ...dto, id: (Array.isArray(result) ? result[0] : result).insertId } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateRollupField(id: number, dto: UpdateRollupFieldDto) {
    try {
      await this.db
        .update(automationRollupFields)
        .set(dto)
        .where(eq(automationRollupFields.id, id));

      const result = await this.db
        .select()
        .from(automationRollupFields)
        .where(eq(automationRollupFields.id, id));

      if (!result.length) {
        return { success: false, error: 'Rollup field not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteRollupField(id: number) {
    try {
      const result = await this.db
        .select()
        .from(automationRollupFields)
        .where(eq(automationRollupFields.id, id));

      if (!result.length) {
        return { success: false, error: 'Rollup field not found' };
      }

      await this.db
        .delete(automationRollupFields)
        .where(eq(automationRollupFields.id, id));

      return { success: true, message: 'Rollup field deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
