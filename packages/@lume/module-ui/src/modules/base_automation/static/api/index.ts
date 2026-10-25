/**
 * Automation API
 * API for workflows, flows, business rules, and approval chains
 */
import { get, post, put, del } from '@/api/request';

// Workflow types
export interface WorkflowState {
  code: string;
  name: string;
  sequence: number;
  color?: string;
  is_start: boolean;
  is_end: boolean;
  sla_hours?: number;
}

export interface WorkflowTransition {
  from_state: string;
  to_state: string;
  name: string;
  code: string;
  button_name?: string;
  requires_approval: boolean;
}

export interface Workflow {
  id: number;
  code: string;
  name: string;
  description?: string;
  model_name: string;
  state_field: string;
  default_state: string;
  is_active: boolean;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  createdAt?: string;
  updatedAt?: string;
}

// Flow types
export interface Flow {
  id: number;
  model?: string;
  name: string;
  code: string;
  description?: string;
  trigger_type: 'record' | 'schedule' | 'manual' | 'api' | 'subflow';
  status: 'draft' | 'active' | 'inactive';
  version?: number;
  nodes?: any[];
  edges?: any[];
  createdAt?: string;
  updatedAt?: string;
}

// Business Rule types
export interface RuleCondition {
  field: string;
  operator: string;
  value: any;
}

export interface RuleAction {
  action_type: string;
  config?: Record<string, any>;
}

export interface BusinessRule {
  id: number;
  name: string;
  entity_type: string;
  is_active: boolean;
  priority: number;
  trigger_on: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  createdAt?: string;
  updatedAt?: string;
}

// Approval types
export interface ApprovalStep {
  sequence: number;
  approver_type: 'USER' | 'GROUP' | 'ROLE';
  approver_id?: string;
  required: boolean;
  escalation_days?: number;
}

export interface ApprovalChain {
  id: number;
  model: string;
  name: string;
  description?: string;
  is_active: boolean;
  chain_type: 'SEQUENTIAL' | 'PARALLEL' | 'ANY_ONE';
  steps: ApprovalStep[];
  createdAt?: string;
  updatedAt?: string;
}

// Workflows
const workflowFromNest = (row: any): Workflow => ({ ...row, code: String(row.id),
  model_name: row.model, default_state: row.initialState || '', is_active: row.status === 'active',
  states: row.states || [], transitions: row.transitions || [] });
function workflowToNest(data: Partial<Workflow>) {
  return { name: data.name, description: data.description, model: data.model_name,
    initialState: data.default_state, states: data.states, transitions: data.transitions,
    ...(data.is_active === undefined ? {} : { status: data.is_active ? 'active' : 'inactive' }) };
}
export async function getWorkflows(): Promise<Workflow[]> {
  return (await get<any[]>('/automation/workflows')).map(workflowFromNest);
}
export async function createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
  return workflowFromNest(await post('/automation/workflows', workflowToNest(data)));
}
export async function getWorkflow(code: string): Promise<Workflow> {
  return workflowFromNest(await get(`/automation/workflows/${encodeURIComponent(code)}`));
}
export async function updateWorkflow(code: string, data: Partial<Workflow>): Promise<Workflow> {
  return workflowFromNest(await put(`/automation/workflows/${encodeURIComponent(code)}`, workflowToNest(data)));
}
export function deleteWorkflow(code: string): Promise<void> {
  return del(`/automation/workflows/${encodeURIComponent(code)}`);
}

// Workflow Definitions (for designer)
export function getWorkflowDefinitionApi(id: string | number): Promise<Workflow> {
  return getWorkflow(String(id));
}
export function createWorkflowDefinitionApi(data: Partial<Workflow>): Promise<Workflow> {
  return createWorkflow(data);
}
export function updateWorkflowDefinitionApi(id: string | number, data: Partial<Workflow>): Promise<Workflow> {
  return updateWorkflow(String(id), data);
}
export async function validateWorkflowDefinitionApi(data: Partial<Workflow>): Promise<{ errors: string[] }> {
  const result = await post<{ errors: string[] }>('/automation/workflows/validate', workflowToNest(data));
  if (result.errors?.length) throw new Error(result.errors.join('; '));
  return result;
}
export function getWorkflowDefinitionsApi(params?: Record<string, unknown>): Promise<Workflow[]> {
  return get<any[]>('/automation/workflows', params).then(rows => rows.map(workflowFromNest));
}
export function deleteWorkflowDefinitionApi(id: string | number): Promise<void> {
  return deleteWorkflow(String(id));
}
export function getApprovalChainsApi(): Promise<ApprovalChain[]> {
  return getApprovals();
}

// Workflow Execution
export function startWorkflowExecutionApi(workflowId: string | number, recordId: string): Promise<any> {
  return post<any>(`/automation/workflows/${workflowId}/run/${recordId}`, {});
}
export function getWorkflowExecutionApi(workflowId: string | number, executionId: string | number): Promise<any> {
  return get<any>(`/automation/workflows/${workflowId}/executions/${executionId}`);
}
export function transitionWorkflowStateApi(workflowId: string | number, executionId: string | number, data: { transitionCode: string; version: number }): Promise<any> {
  return post<any>(`/automation/workflows/${workflowId}/executions/${executionId}/transition`, data);
}

// Flows
const flowFromNest = (row: any): Flow => ({ ...row, code: String(row.id), trigger_type: row.trigger });
const flowToNest = (data: Partial<Flow>) => ({ name: data.name, model: data.model,
  description: data.description, trigger: data.trigger_type, status: data.status, nodes: data.nodes, edges: data.edges });
export async function getFlows(params?: Record<string, any>): Promise<Flow[]> {
  return (await get<any[]>('/automation/flows', params)).map(flowFromNest);
}
export async function createFlow(data: Partial<Flow>): Promise<Flow> {
  return flowFromNest(await post('/automation/flows', flowToNest(data)));
}
export async function getFlow(id: number): Promise<Flow> {
  return flowFromNest(await get(`/automation/flows/${id}`));
}
export async function updateFlow(id: number, data: Partial<Flow>): Promise<Flow> {
  return flowFromNest(await put(`/automation/flows/${id}`, flowToNest(data)));
}
export function deleteFlow(id: number): Promise<void> {
  return del(`/automation/flows/${id}`);
}
export function activateFlow(id: number): Promise<void> {
  return put(`/automation/flows/${id}`, { status: 'active' });
}
export function deactivateFlow(id: number): Promise<void> {
  return put(`/automation/flows/${id}`, { status: 'inactive' });
}
export async function cloneFlow(id: number): Promise<Flow> {
  const source = await getFlow(id);
  return createFlow({ ...source, name: `${source.name.slice(0, 93)} (copy)`, status: 'draft' });
}

// Business Rules
export function getRules(): Promise<BusinessRule[]> {
  return get<BusinessRule[]>('/base_automation/rules');
}
export function createRule(data: Partial<BusinessRule>): Promise<BusinessRule> {
  return post<BusinessRule>('/base_automation/rules', data);
}
export function updateRule(id: number, data: Partial<BusinessRule>): Promise<BusinessRule> {
  return put<BusinessRule>(`/base_automation/rules/${id}`, data);
}
export function deleteRule(id: number): Promise<void> {
  return del(`/base_automation/rules/${id}`);
}
export function toggleRule(id: number): Promise<BusinessRule> {
  return post<BusinessRule>(`/base_automation/rules/${id}/toggle`);
}

// Approval chains execute sequentially; each step targets one user or role.
function approvalSteps(value: unknown): any[] {
  const steps = typeof value === 'string' ? JSON.parse(value) : value ?? [];
  if (!Array.isArray(steps)) throw new Error('Invalid persisted approval steps');
  return steps;
}
const approvalFromNest = (row: any): ApprovalChain => ({ ...row,
  is_active: row.status === 'active', chain_type: 'SEQUENTIAL',
  steps: approvalSteps(row.steps).map((step: any, index: number) => ({ ...step,
    sequence: index + 1, required: true,
    approver_type: step.roleId !== undefined ? 'ROLE' : 'USER',
    approver_id: String(step.roleId ?? step.approverId ?? ''),
  })),
});
function approvalToNest(data: Partial<ApprovalChain>) {
  if (data.chain_type && data.chain_type !== 'SEQUENTIAL') throw new Error('Only sequential approvals are supported');
  const steps = data.steps?.slice().sort((a, b) => a.sequence - b.sequence).map(step => {
    const id = Number(step.approver_id);
    if (!Number.isSafeInteger(id) || id < 1 || !['USER', 'ROLE'].includes(step.approver_type)) {
      throw new Error('Each step requires a positive user or role ID');
    }
    if (step.required === false || step.escalation_days != null) throw new Error('Optional steps and escalation are not supported');
    return { ...(typeof (step as any).name === 'string' ? { name: (step as any).name } : {}),
      ...(step.approver_type === 'ROLE' ? { roleId: id } : { approverId: id }) };
  });
  return { name: data.name, model: data.model, description: data.description, steps,
    ...(data.is_active === undefined ? {} : { status: data.is_active ? 'active' : 'inactive' }) };
}
export async function getApprovals(): Promise<ApprovalChain[]> {
  return (await get<any[]>('/automation/approvals')).map(approvalFromNest);
}
export async function createApproval(data: Partial<ApprovalChain>): Promise<ApprovalChain> {
  return approvalFromNest(await post('/automation/approvals', approvalToNest(data)));
}
export async function updateApproval(id: number, data: Partial<ApprovalChain>): Promise<ApprovalChain> {
  return approvalFromNest(await put(`/automation/approvals/${id}`, approvalToNest(data)));
}
export function deleteApproval(id: number): Promise<void> {
  return del(`/automation/approvals/${id}`);
}
export function getPendingApprovals(): Promise<any[]> {
  return listApprovalRequests('pending').then(page => page.items);
}
export function getPendingApprovalsApi(): Promise<any[]> {
  return getPendingApprovals();
}
export function getApprovalHistoryApi(params?: any): Promise<any[]> {
  return listApprovalRequests('history', params?.before).then(page => page.items);
}
export interface ApprovalRequestView {
  id: number; chainId: number; recordEntityId: number; recordId: number;
  status: 'pending' | 'completed' | 'rejected'; currentStep: number; completedAt: string | null;
  stepsData: { name?: string; status: string; approverId?: number; roleId?: number; reason?: string; actedBy?: number; actedAt?: string }[];
}
export function listApprovalRequests(view: 'pending' | 'history', before?: number): Promise<{items: ApprovalRequestView[]; nextCursor: number | null}> {
  return get('/automation/approval-requests', { view, before, limit: 25 });
}
export function approveTaskApi(taskId: number, data: {stepIndex: number}): Promise<any> {
  return post(`/automation/approval-requests/${taskId}/approve`, { stepIndex: data.stepIndex });
}
export function rejectTaskApi(taskId: number, data: {stepIndex: number; reason: string}): Promise<any> {
  return post(`/automation/approval-requests/${taskId}/reject`, { stepIndex: data.stepIndex, reason: data.reason });
}
export function delegateTaskApi(taskId: number, data: any): Promise<any> {
  return post<any>(`/base_automation/approvals/tasks/${taskId}/delegate`, data);
}
export async function getApprovalChainApi(id: number): Promise<ApprovalChain> {
  return approvalFromNest(await get(`/automation/approvals/${id}`));
}

// Workflow approval callbacks
export async function approveWorkflowApprovalApi(instanceId: number, userId: string): Promise<any> {
  return post<any>(`/base_automation/approvals/${instanceId}/callback`, {
    decision: 'approved',
    userId
  });
}

export async function rejectWorkflowApprovalApi(instanceId: number, userId: string): Promise<any> {
  return post<any>(`/base_automation/approvals/${instanceId}/callback`, {
    decision: 'rejected',
    userId
  });
}

// Escalation History
export async function getEscalationHistoryApi(instanceId: number): Promise<any[]> {
  return get<any[]>(`/base_automation/approvals/escalations/${instanceId}`);
}

export async function getTaskEscalationHistoryApi(taskId: number): Promise<any[]> {
  return get<any[]>(`/base_automation/approvals/escalations/task/${taskId}`);
}

// Dashboard Analytics Types
export interface ApprovalMetrics {
  totalApprovals: number;
  avgTime: number;
  slaBreachers: number;
  breachRate: number;
}

export interface BottleneckTask {
  id: number;
  taskId: number;
  pendingFor: number;
  assignedTo: string;
}

export interface EscalationMetrics {
  totalEscalations: number;
  byLevel: Record<number, number>;
  byReason: Record<string, number>;
}

// Analytics API
export async function getApprovalMetricsApi(filters?: any): Promise<ApprovalMetrics> {
  return get<ApprovalMetrics>('/base_automation/approvals/analytics/metrics', { params: filters });
}

export async function getApprovalBottlenecksApi(limit?: number): Promise<BottleneckTask[]> {
  const params = limit ? { limit } : undefined;
  return get<BottleneckTask[]>('/base_automation/approvals/analytics/bottlenecks', { params });
}

export async function getEscalationMetricsApi(): Promise<EscalationMetrics> {
  return get<EscalationMetrics>('/base_automation/approvals/analytics/escalations');
}

export async function getRoleApprovalMetricsApi(role: string): Promise<any> {
  return get<any>(`/base_automation/approvals/analytics/roles/${role}`);
}
