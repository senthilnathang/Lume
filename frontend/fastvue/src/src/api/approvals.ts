// Approval types and API
export type ChainType = 'SEQUENTIAL' | 'PARALLEL' | 'ANY_ONE'
export type ApproverType = 'USER' | 'ROLE' | 'MANAGER' | 'DYNAMIC' | 'GROUP'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'ESCALATED' | 'CANCELLED' | 'EXPIRED'
export interface ApprovalStep {
  id: string
  chain_id: string
  sequence: number
  name: string
  approver_type: ApproverType
  approver_id?: string
  approver_role?: string
  approver_field?: string
  required_count: number
  sla_hours: number
  escalation_to?: string
  can_delegate: boolean
  can_reassign: boolean
  auto_approve_on_timeout: boolean
  created_at: string
}

export interface ApprovalChain {
  id: string
  company_id: string
  name: string
  description?: string
  chain_type: ChainType
  is_active: boolean
  steps: ApprovalStep[]
  created_at: string
  updated_at: string
}

export interface ApprovalTask {
  id: string
  chain_id: string
  step_id: string
  entity_type: string
  entity_id: string
  workflow_id?: string
  transition_id?: string
  status: ApprovalStatus
  assigned_to: string
  assigned_to_name?: string
  assigned_at: string
  due_at?: string
  completed_at?: string
  completed_by?: string
  completed_by_name?: string
  decision?: string
  comments?: string
  delegated_to?: string
  delegated_reason?: string
  escalation_count: number
  escalation_reason?: string
  context?: any
  created_at: string
  chain_name?: string
  step_name?: string
  entity_ref?: string
}

export interface CreateApprovalChainRequest {
  company_id: string
  name: string
  description?: string
  chain_type: ChainType
  steps: {
    sequence: number
    name: string
    approver_type: ApproverType
    approver_id?: string
    approver_role?: string
    approver_field?: string
    required_count?: number
    sla_hours?: number
    escalation_to?: string
    can_delegate?: boolean
    can_reassign?: boolean
    auto_approve_on_timeout?: boolean
  }[]
}

export interface UpdateApprovalChainRequest {
  name?: string
  description?: string
  chain_type?: ChainType
  is_active?: boolean
}

export interface ApprovalChainListParams {
  company_id?: string
  is_active?: boolean
  limit?: number
  offset?: number
}

export interface ApprovalTaskListParams {
  assigned_to?: string
  status?: ApprovalStatus
  entity_type?: string
  entity_id?: string
  is_pending?: boolean
  is_overdue?: boolean
  limit?: number
  offset?: number
}

export interface ApproveRequest {
  user_id: string
  comments?: string
}

export interface RejectRequest {
  user_id: string
  reason: string
}

export interface DelegateRequest {
  from_user_id: string
  to_user_id: string
  reason?: string
}

export interface ApprovalResult {
  task_id: string
  status: ApprovalStatus
  is_chain_complete: boolean
  next_step_created: boolean
  next_task_id?: string
  workflow_advanced: boolean
  error?: string
}

export interface ApprovalSummary {
  entity_type: string
  entity_id: string
  chain_id: string
  chain_name: string
  total_steps: number
  completed_steps: number
  current_step: number
  current_step_name: string
  status: ApprovalStatus
  pending_with?: string
  tasks: ApprovalTask[]
}

export interface PendingApprovalCount {
  user_id: string
  total_count: number
  overdue_count: number
  by_entity_type: Record<string, number>
}

import { requestClient } from './request'

export const approvalsApi = {
  // Approval Chains
  getChains: (params?: ApprovalChainListParams) =>
    requestClient.get<ApprovalChain[]>('/base/approval-chains/', { params }),
  getChainById: (id: string) =>
    requestClient.get<ApprovalChain>(`/base/approval-chains/${id}/`),
  createChain: (data: CreateApprovalChainRequest) =>
    requestClient.post<ApprovalChain>('/base/approval-chains/', data),
  updateChain: (id: string, data: UpdateApprovalChainRequest) =>
    requestClient.put<ApprovalChain>(`/base/approval-chains/${id}/`, data),
  deleteChain: (id: string) =>
    requestClient.delete(`/base/approval-chains/${id}/`),

  // Approval Tasks
  getPendingTasks: (params?: ApprovalTaskListParams) =>
    requestClient.get<ApprovalTask[]>('/base/approvals/pending/', { params }),
  getTaskHistory: (params?: ApprovalTaskListParams) =>
    requestClient.get<ApprovalTask[]>('/base/approvals/history/', { params }),
  approveTask: (taskId: string, data: ApproveRequest) =>
    requestClient.post<ApprovalResult>(`/base/approvals/${taskId}/approve/`, data),
  rejectTask: (taskId: string, data: RejectRequest) =>
    requestClient.post<ApprovalResult>(`/base/approvals/${taskId}/reject/`, data),
  delegateTask: (taskId: string, data: DelegateRequest) =>
    requestClient.post<ApprovalResult>(`/base/approvals/${taskId}/delegate/`, data),
  getEntityApprovals: (entityType: string, entityId: string) =>
    requestClient.get<ApprovalSummary>(`/base/approvals/entity/${entityType}/${entityId}/`),
}