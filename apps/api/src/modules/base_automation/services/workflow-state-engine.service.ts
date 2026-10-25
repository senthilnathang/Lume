import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkflowStateExecution } from '@prisma/client';
import { PrismaService } from '@core/services/prisma.service';
import { SecurityService } from '@modules/base/services/security.service';
import { workflowDefinitionErrors } from './workflow-definition-validation';

type Context = { userId: number; companyId: number };
type Definition = { name: string; model: string; initialState: string; states: Array<{ code: string; name?: string; is_end?: boolean }>; transitions: Array<Record<string, any>> };

@Injectable()
export class WorkflowStateEngineService {
  constructor(private readonly prisma: PrismaService) {}

  private ids(...values: number[]) {
    if (values.some(value => !Number.isSafeInteger(value) || value < 1)) throw new BadRequestException('Positive integer IDs required');
  }

  private async access(tx: Prisma.TransactionClient, entityId: number, recordId: number, context: Context, write: boolean) {
    this.ids(context.userId, context.companyId, entityId, recordId);
    const user = await tx.user.findUnique({ where: { id: context.userId } });
    const role = user && await tx.role.findUnique({ where: { id: user.role_id } });
    if (!user?.isActive || !role?.isActive) throw new ForbiddenException('Active actor and role required');
    const security = new SecurityService(tx as PrismaService);
    for (const permission of write ? ['base.records.read', 'base.records.write'] : ['base.records.read']) {
      if (!await security.checkPermission(user.id, permission)) throw new ForbiddenException('Record permission required');
    }
    const rows = await tx.$queryRaw<Array<{ data: string; model: string; visibility: string; createdBy: number }>>(Prisma.sql`
      SELECT r.data, e.name AS model, r.visibility, r.created_by AS createdBy
      FROM entity_records r JOIN entities e ON e.id = r.entity_id
      WHERE r.id = ${recordId} AND r.entity_id = ${entityId} AND r.company_id = ${context.companyId}
        AND r.deleted_at IS NULL AND e.deleted_at IS NULL FOR UPDATE`);
    if (!rows.length) throw new NotFoundException('Workflow record not found');
    const row = rows[0];
    if (row.visibility === 'private' && row.createdBy !== user.id && !['admin', 'super_admin'].includes(role.name)) throw new ForbiddenException('Private record');
    let data: Record<string, unknown>;
    try { data = JSON.parse(row.data); } catch { throw new BadRequestException('Invalid record data'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new BadRequestException('Invalid record data');
    for (const action of write ? ['read', 'write'] : ['read']) {
      if (!(await security.recordPredicate(['EntityRecord', 'entity_records', row.model], action, { userId: user.id, roleId: user.role_id }))(data)) throw new ForbiddenException('Workflow record access denied');
    }
  }

  private blocked(transition: Record<string, any>): string | undefined {
    const supported = new Set(['code', 'name', 'from_state', 'to_state', 'id', 'button_name', 'button_class', 'confirm_message', 'sequence', 'required_groups', 'requires_approval', 'approval_chain_id', 'timer_hours', 'webhook_url', 'webhook_method']);
    if (Object.keys(transition).some(key => !supported.has(key))) return 'Transition configuration is not supported by the manual runtime';
    if (transition.requires_approval || transition.approval_chain_id) return 'Approval transitions are not supported yet';
    if (transition.timer_hours) return 'Timed transitions are not supported yet';
    if (transition.webhook_url) return 'Webhook transitions are not supported yet';
    if (transition.required_groups != null && (!Array.isArray(transition.required_groups) || transition.required_groups.length)) return 'Group-restricted transitions are not supported yet';
    for (const key of ['actions', 'conditions', 'condition', 'guard']) {
      const value = transition[key];
      if (value != null && value !== '' && !(Array.isArray(value) && value.length === 0)) return 'Conditional/action transitions are not supported yet';
    }
  }

  private view(row: WorkflowStateExecution) {
    const { definition: _definition, ...execution } = row;
    return execution;
  }

  private definition(row: WorkflowStateExecution): Definition {
    try { return JSON.parse(row.definition); } catch { throw new ConflictException('Invalid execution snapshot'); }
  }

  private async execution(tx: Prisma.TransactionClient, workflowId: number, id: number, context: Context) {
    this.ids(workflowId, id, context.companyId, context.userId);
    const locked = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT id FROM workflow_state_executions
      WHERE id=${id} AND workflow_id=${workflowId} AND company_id=${context.companyId} FOR UPDATE`);
    if (!locked.length) throw new NotFoundException('Workflow execution not found');
    return tx.workflowStateExecution.findUniqueOrThrow({ where: { id } });
  }

  async start(workflowId: number, recordId: number, context: Context) {
    this.ids(workflowId, recordId, context.userId, context.companyId);
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM automation_workflows WHERE id=${workflowId} FOR UPDATE`);
      const workflow = await tx.automation_workflows.findUnique({ where: { id: workflowId } });
      if (!workflow) throw new NotFoundException('Workflow not found');
      if (workflow.status !== 'active') throw new ConflictException('Workflow must be active');
      let definition: Definition;
      try { definition = { name: workflow.name, model: workflow.model, initialState: workflow.initial_state,
        states: JSON.parse(workflow.states || '[]'), transitions: JSON.parse(workflow.transitions || '[]') }; }
      catch { throw new BadRequestException('Invalid workflow graph'); }
      const errors = workflowDefinitionErrors(definition);
      if (errors.length) throw new BadRequestException({ message: 'Invalid workflow graph', errors });
      for (const state of definition.states as Array<Record<string, any>>) {
        const supported = new Set(['code', 'name', 'id', 'color', 'is_start', 'is_end', 'is_decision', 'sla_hours', 'sequence', 'x', 'y']);
        if (state.is_decision || state.sla_hours || Object.keys(state).some(key => !supported.has(key))) {
          throw new ConflictException('Decision, SLA and state-action execution is not supported yet');
        }
      }
      const entity = await tx.entity.findFirst({ where: { name: workflow.model, deletedAt: null } });
      if (!entity) throw new NotFoundException('Workflow entity not found');
      await this.access(tx, entity.id, recordId, context, true);
      const completed = definition.states.find(state => state.code === definition.initialState)?.is_end === true;
      const execution = await tx.workflowStateExecution.create({ data: {
        workflowId, recordEntityId: entity.id, recordId, companyId: context.companyId, initiatedBy: context.userId,
        definition: JSON.stringify(definition), currentState: definition.initialState,
        status: completed ? 'completed' : 'active', completedAt: completed ? new Date() : null,
      } });
      await tx.workflowStateHistory.create({ data: { executionId: execution.id, version: 0,
        toState: execution.currentState, transitionCode: 'START', transitionName: 'Started', userId: context.userId } });
      return this.view(execution);
    });
  }

  async get(workflowId: number, id: number, context: Context) {
    return this.prisma.$transaction(async tx => {
      const execution = await this.execution(tx, workflowId, id, context);
      await this.access(tx, execution.recordEntityId, execution.recordId, context, false);
      const definition = this.definition(execution);
      return { execution: this.view(execution),
        history: await tx.workflowStateHistory.findMany({ where: { executionId: id }, orderBy: { version: 'asc' } }),
        workflow: { id: workflowId, name: definition.name,
          states: definition.states.map(state => ({ code: state.code, name: state.name, is_end: state.is_end })),
          transitions: definition.transitions.map(transition => ({ code: transition.code, name: transition.name || transition.code,
            from_state: transition.from_state, to_state: transition.to_state, unavailableReason: this.blocked(transition) })) },
      };
    });
  }

  async transition(workflowId: number, id: number, input: { transitionCode: string; version: number }, context: Context) {
    if (!Number.isSafeInteger(input.version) || input.version < 0 || typeof input.transitionCode !== 'string' || !input.transitionCode.trim()) throw new BadRequestException('Transition code and current version required');
    return this.prisma.$transaction(async tx => {
      const execution = await this.execution(tx, workflowId, id, context);
      await this.access(tx, execution.recordEntityId, execution.recordId, context, true);
      if (execution.status !== 'active' || execution.version !== input.version) throw new ConflictException('Execution changed; refresh before transitioning');
      const definition = this.definition(execution);
      const transition = definition.transitions.find(item => item.code === input.transitionCode && item.from_state === execution.currentState);
      if (!transition) throw new BadRequestException('Transition is not available from the current state');
      const reason = this.blocked(transition);
      if (reason) throw new ConflictException(reason);
      const target = definition.states.find(state => state.code === transition.to_state);
      if (!target) throw new ConflictException('Transition target is missing');
      const updated = await tx.workflowStateExecution.update({ where: { id }, data: {
        currentState: target.code, status: target.is_end ? 'completed' : 'active',
        completedAt: target.is_end ? new Date() : null, version: { increment: 1 },
      } });
      await tx.workflowStateHistory.create({ data: { executionId: id, version: updated.version,
        fromState: execution.currentState, toState: target.code, transitionCode: transition.code,
        transitionName: String(transition.name || transition.code).slice(0, 255), userId: context.userId } });
      return this.view(updated);
    });
  }
}
