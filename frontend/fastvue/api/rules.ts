// Business Rules types and API
// Values match backend enums (lowercase)
export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'regex' | 'is_null' | 'is_not_null' | 'is_empty' | 'is_not_empty' | 'between' | 'changed' | 'not_changed' | 'changed_to' | 'changed_from'
export type LogicalOperator = 'and' | 'or'
export type RuleActionType = 'set_field' | 'validate' | 'require_approval' | 'send_notification' | 'send_email' | 'send_sms' | 'create_task' | 'webhook' | 'trigger_workflow' | 'block' | 'log' | 'execute_code' | 'create_record'
export type RuleTriggerType = 'before_create' | 'after_create' | 'before_update' | 'after_update' | 'before_delete' | 'after_delete' | 'on_status_change' | 'before_status_change' | 'on_approval' | 'on_rejection' | 'scheduled' | 'manual'
export type ErrorHandling = 'continue' | 'stop' | 'rollback'

export interface RuleCondition {
  field: string
  operator: ConditionOperator
  value?: any
  value_type?: string  // 'static', 'field', or 'formula'
  value_field?: string
}

export interface RuleAction {
  type: RuleActionType
  target_field?: string
  value?: any
  value_type?: string  // 'static', 'field', or 'formula'
  message?: string
  chain_id?: number
  template_id?: number
  recipient_field?: string
  recipients?: number[]
  url?: string
  method?: string
  headers?: Record<string, string>
  transition_code?: string
  task_type?: string
  assignee_field?: string
  record_type?: string
  record_data?: Record<string, any>
  code?: string
}

export interface BusinessRule {
  id: number
  name: string
  code: string
  description?: string
  entity_type: string
  trigger_type: RuleTriggerType  // Single value, not array
  status_field: string
  from_status?: string
  to_status?: string
  condition_logic: LogicalOperator
  priority: number
  stop_on_match: boolean
  error_handling: ErrorHandling
  cron_expression?: string
  execution_count: number
  success_count: number
  failure_count: number
  last_executed_at?: string
  is_active: boolean
  company_id: number
  created_by?: number
  updated_by?: number
  created_at: string
  updated_at?: string
  conditions: RuleCondition[]
  actions: RuleAction[]
}

export interface CreateRuleRequest {
  name: string
  code: string
  description?: string
  entity_type: string
  trigger_type: RuleTriggerType
  status_field?: string
  from_status?: string
  to_status?: string
  conditions?: RuleCondition[]
  condition_logic?: LogicalOperator
  actions?: RuleAction[]
  priority?: number
  stop_on_match?: boolean
  error_handling?: ErrorHandling
  cron_expression?: string
  is_active?: boolean
}

export interface UpdateRuleRequest {
  name?: string
  description?: string
  trigger_type?: RuleTriggerType
  status_field?: string
  from_status?: string
  to_status?: string
  conditions?: RuleCondition[]
  condition_logic?: LogicalOperator
  actions?: RuleAction[]
  priority?: number
  stop_on_match?: boolean
  error_handling?: ErrorHandling
  cron_expression?: string
  is_active?: boolean
}

export interface RuleListParams {
  entity_type?: string
  trigger_type?: string
  is_active?: boolean
  search?: string
  page?: number
  page_size?: number
}

export interface RuleTestRequest {
  entity_data: any
  old_entity_data?: any
}

export interface ConditionTestResult {
  condition_index: number
  field: string
  operator: string
  expected_value: any
  actual_value: any
  result: boolean
}

export interface ActionTestResult {
  action_index: number
  action_type: string
  would_execute: boolean
  simulated_result?: Record<string, any>
}

export interface RuleTestResult {
  rule_id: number
  rule_code: string
  conditions_matched: boolean
  condition_results: ConditionTestResult[]
  action_results: ActionTestResult[]
  errors: string[]
}

import { requestClient } from './request'

export const rulesApi = {
  getAll: (params?: RuleListParams) =>
    requestClient.get<BusinessRule[]>('/base/rules/', { params }),
  getById: (id: string) =>
    requestClient.get<BusinessRule>(`/base/rules/${id}/`),
  create: (data: CreateRuleRequest) =>
    requestClient.post<BusinessRule>('/base/rules/', data),
  update: (id: string, data: UpdateRuleRequest) =>
    requestClient.put<BusinessRule>(`/base/rules/${id}/`, data),
  delete: (id: string) =>
    requestClient.delete(`/base/rules/${id}/`),
  toggle: (id: string) =>
    requestClient.post<{ is_active: boolean }>(`/base/rules/${id}/toggle/`),
  test: (id: string, data: RuleTestRequest) =>
    requestClient.post<RuleTestResult>(`/base/rules/${id}/test/`, data),
}