/**
 * Automation API
 * API for workflows, flows, business rules, and approval chains
 */
import { get, post, put, del } from './request';

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
  name: string;
  code: string;
  description?: string;
  trigger_type: 'record' | 'schedule' | 'manual' | 'api' | 'subflow';
  status: 'draft' | 'active' | 'inactive';
  version: number;
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
  name: string;
  description?: string;
  is_active: boolean;
  chain_type: 'SEQUENTIAL' | 'PARALLEL' | 'ANY_ONE';
  steps: ApprovalStep[];
  createdAt?: string;
  updatedAt?: string;
}

// Workflows
export function getWorkflows(): Promise<Workflow[]> {
  return get<Workflow[]>('/base_automation/workflows');
}
export function createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
  return post<Workflow>('/base_automation/workflows', data);
}
export function getWorkflow(code: string): Promise<Workflow> {
  return get<Workflow>(`/base_automation/workflows/${code}`);
}
export function updateWorkflow(code: string, data: Partial<Workflow>): Promise<Workflow> {
  return put<Workflow>(`/base_automation/workflows/${code}`, data);
}
export function deleteWorkflow(code: string): Promise<void> {
  return del(`/base_automation/workflows/${code}`);
}

// Flows
export function getFlows(params?: Record<string, any>): Promise<Flow[]> {
  return get<Flow[]>('/base_automation/flows', { params });
}
export function createFlow(data: Partial<Flow>): Promise<Flow> {
  return post<Flow>('/base_automation/flows', data);
}
export function getFlow(id: number): Promise<Flow> {
  return get<Flow>(`/base_automation/flows/${id}`);
}
export function updateFlow(id: number, data: Partial<Flow>): Promise<Flow> {
  return put<Flow>(`/base_automation/flows/${id}`, data);
}
export function deleteFlow(id: number): Promise<void> {
  return del(`/base_automation/flows/${id}`);
}
export function activateFlow(id: number): Promise<void> {
  return post(`/base_automation/flows/${id}/activate`);
}
export function deactivateFlow(id: number): Promise<void> {
  return post(`/base_automation/flows/${id}/deactivate`);
}
export function cloneFlow(id: number): Promise<Flow> {
  return post<Flow>(`/base_automation/flows/${id}/clone`);
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

// Approval Chains
export function getApprovals(): Promise<ApprovalChain[]> {
  return get<ApprovalChain[]>('/base_automation/approvals');
}
export function createApproval(data: Partial<ApprovalChain>): Promise<ApprovalChain> {
  return post<ApprovalChain>('/base_automation/approvals', data);
}
export function updateApproval(id: number, data: Partial<ApprovalChain>): Promise<ApprovalChain> {
  return put<ApprovalChain>(`/base_automation/approvals/${id}`, data);
}
export function deleteApproval(id: number): Promise<void> {
  return del(`/base_automation/approvals/${id}`);
}
export function getPendingApprovals(): Promise<any[]> {
  return get<any[]>('/base_automation/approvals/pending');
}
