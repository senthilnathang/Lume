// Workflow types and API
export type StateType = 'INITIAL' | 'INTERMEDIATE' | 'TERMINAL'
export type TransitionTrigger = 'MANUAL' | 'AUTO' | 'APPROVAL' | 'SCHEDULED'
export type ChainType = 'SEQUENTIAL' | 'PARALLEL' | 'ANY_ONE'
export type ApproverType = 'USER' | 'ROLE' | 'MANAGER' | 'DYNAMIC' | 'GROUP'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'ESCALATED' | 'CANCELLED' | 'EXPIRED'
export type ConditionOperator = 'EQ' | 'NE' | 'GT' | 'LT' | 'GTE' | 'LTE' | 'IN' | 'NOT_IN' | 'CONTAINS' | 'NOT_CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX' | 'BETWEEN' | 'IS_NULL' | 'IS_NOT_NULL'
export type LogicalOperator = 'AND' | 'OR'
export type RuleActionType = 'SET_FIELD' | 'VALIDATE' | 'REQUIRE_APPROVAL' | 'SEND_EMAIL' | 'SEND_SMS' | 'WEBHOOK' | 'CREATE_TASK' | 'LOG'
export type RuleTriggerType = 'BEFORE_CREATE' | 'AFTER_CREATE' | 'BEFORE_UPDATE' | 'AFTER_UPDATE' | 'BEFORE_DELETE' | 'AFTER_DELETE' | 'ON_STATUS_CHANGE' | 'ON_APPROVAL' | 'SCHEDULED'

export interface WorkflowState {
  id: string
  workflow_id: string
  code: string
  name: string
  state_type: StateType
  entry_actions: any[]
  exit_actions: any[]
  allow_edit: boolean
  allow_delete: boolean
  sla_hours?: number
  sequence: number
  created_at: string
}

export interface WorkflowTransition {
  id: string
  workflow_id: string
  from_state_code: string
  to_state_code: string
  name: string
  trigger_type: TransitionTrigger
  requires_approval: boolean
  approval_chain_id?: string
  guards: any[]
  actions: any[]
  created_at: string
}

export interface WorkflowDefinition {
  id: string
  company_id: string
  entity_type: string
  name: string
  description?: string
  version: number
  is_active: boolean
  states: WorkflowState[]
  transitions: WorkflowTransition[]
  created_at: string
  updated_at: string
}

export interface EntityWorkflowState {
  id: string
  entity_type: string
  entity_id: string
  workflow_id: string
  current_state: string
  entered_at: string
  created_at: string
  updated_at: string
}

export interface WorkflowStateHistory {
  id: string
  entity_type: string
  entity_id: string
  from_state?: string
  to_state: string
  transition_id?: string
  triggered_by?: string
  triggered_at: string
  context?: any
}

export interface CreateWorkflowRequest {
  company_id: string
  entity_type: string
  name: string
  description?: string
  states: {
    code: string
    name: string
    state_type: StateType
    entry_actions?: any[]
    exit_actions?: any[]
    allow_edit?: boolean
    allow_delete?: boolean
    sla_hours?: number
    sequence: number
  }[]
  transitions: {
    from_state_code: string
    to_state_code: string
    name: string
    trigger_type: TransitionTrigger
    requires_approval?: boolean
    approval_chain_id?: string
    guards?: any[]
    actions?: any[]
  }[]
}

export interface UpdateWorkflowRequest {
  name?: string
  description?: string
  is_active?: boolean
}

export interface WorkflowListParams {
  company_id?: string
  entity_type?: string
  is_active?: boolean
  limit?: number
  offset?: number
}

export interface TransitionRequest {
  to_state: string
  user_id: string
  comments?: string
  context?: any
}

export interface TransitionResult {
  success: boolean
  from_state: string
  to_state: string
  requires_approval: boolean
  approval_task_id?: string
  error?: string
}

export interface AvailableTransition {
  id: string
  to_state_code: string
  to_state_name: string
  name: string
  trigger_type: TransitionTrigger
  requires_approval: boolean
}

import { requestClient } from './request'

export const workflowsApi = {
  // Workflow Definitions
  getAll: (params?: WorkflowListParams) =>
    requestClient.get<WorkflowDefinition[]>('/base/workflows/', { params }),
  getById: (id: string) =>
    requestClient.get<WorkflowDefinition>(`/base/workflows/${id}/`),
  create: (data: CreateWorkflowRequest) =>
    requestClient.post<WorkflowDefinition>('/base/workflows/', data),
  update: (id: string, data: UpdateWorkflowRequest) =>
    requestClient.put<WorkflowDefinition>(`/base/workflows/${id}/`, data),
  delete: (id: string) =>
    requestClient.delete(`/base/workflows/${id}/`),

  // Workflow Execution
  getEntityState: (entityType: string, entityId: string) =>
    requestClient.get<EntityWorkflowState>(`/base/workflows/state/${entityType}/${entityId}/`),
  getAvailableTransitions: (entityType: string, entityId: string, userId?: string) =>
    requestClient.get<AvailableTransition[]>(`/base/workflows/state/${entityType}/${entityId}/transitions/`, { params: { user_id: userId } }),
  executeTransition: (entityType: string, entityId: string, transitionCode: string, data: TransitionRequest) =>
    requestClient.post<TransitionResult>(`/base/workflows/execute/${entityType}/${entityId}/${transitionCode}/`, data),
  getStateHistory: (entityType: string, entityId: string) =>
    requestClient.get<WorkflowStateHistory[]>(`/base/workflows/state/${entityType}/${entityId}/history/`),
}