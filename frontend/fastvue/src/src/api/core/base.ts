import { requestClient } from '#/api/request';

/**
 * Base Configuration API Namespace
 */
export namespace BaseApi {
  /** Company - matches backend CompanyResponse schema */
  export interface Company {
    id: number;
    name: string;
    code: string;
    description: string | null;
    logo_url: string | null;
    is_headquarters: boolean;
    parent_company_id: number | null;
    address: string | null;
    country: string | null;
    state: string | null;
    city: string | null;
    zip_code: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    tax_id: string | null;
    registration_number: string | null;
    date_format: string;
    time_format: string;
    timezone: string;
    currency: string;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;

    // Computed properties (for UI convenience)
    company?: string; // Alias for name
    hq?: boolean; // Alias for is_headquarters
    parent_company?: number | null; // Alias for parent_company_id
    zip?: string | null; // Alias for zip_code
  }

  /** Company Create/Update Params - matches backend CompanyCreate schema */
  export interface CompanyParams {
    name: string;
    code: string;
    description?: string;
    is_headquarters?: boolean;
    parent_company_id?: number | null;
    address?: string;
    country?: string;
    state?: string;
    city?: string;
    zip_code?: string;
    phone?: string;
    email?: string;
    website?: string;
    tax_id?: string;
    registration_number?: string;
    date_format?: string;
    time_format?: string;
    timezone?: string;
    currency?: string;
    is_active?: boolean;

    // Legacy aliases (for backwards compatibility with form)
    company?: string;
    hq?: boolean;
    parent_company?: number | null;
    zip?: string;
  }

  /** Department */
  export interface Department {
    id: number;
    department: string;
    short_code: string | null;
    department_manager_id: {
      id: number;
      full_name: string;
      employee_profile: string | null;
    } | null;
    parent_department: {
      id: number;
      department: string;
    } | null;
    company_id: {
      id: number;
      company: string;
    } | null;
    employee_count?: number;
  }

  /** Job Position */
  export interface JobPosition {
    id: number;
    job_position: string;
    department_id: {
      id: number;
      department: string;
    } | null;
    employee_count?: number;
  }

  /** Job Role */
  export interface JobRole {
    id: number;
    job_role: string;
    job_position_id: {
      id: number;
      job_position: string;
    } | null;
  }

  /** Work Type */
  export interface WorkType {
    id: number;
    work_type: string;
    company_id: {
      id: number;
      company: string;
    } | null;
  }

  /** Employee Shift */
  export interface EmployeeShift {
    id: number;
    employee_shift: string;
    start_time: string;
    end_time: string;
    minimum_working_hour: string | null;
    full_time: string | null;
    grace_time: string | null;
    is_night_shift: boolean;
    company_id: {
      id: number;
      company: string;
    } | null;
  }

  /** Shift Schedule */
  export interface ShiftSchedule {
    id: number;
    day: {
      id: number;
      day: string;
    };
    shift_id: {
      id: number;
      employee_shift: string;
    };
    minimum_working_hour: string | null;
    start_time: string | null;
    end_time: string | null;
    is_weekend: boolean;
  }

  /** Rotating Shift Assign */
  export interface RotatingShiftAssign {
    id: number;
    employee_id: {
      id: number;
      full_name: string;
    };
    rotating_shift_id: {
      id: number;
      name: string;
    };
    start_date: string;
    next_change_date: string | null;
    current_shift: {
      id: number;
      employee_shift: string;
    } | null;
    is_active: boolean;
  }

  /** Shift Request */
  export interface ShiftRequest {
    id: number;
    employee_id: {
      id: number;
      full_name: string;
      employee_profile: string | null;
      badge_id: string;
    };
    shift_id: {
      id: number;
      employee_shift: string;
    };
    requested_date: string;
    requested_till: string | null;
    previous_shift_id: {
      id: number;
      employee_shift: string;
    } | null;
    status: 'requested' | 'approved' | 'rejected' | 'cancelled';
    description: string | null;
    approved_by: {
      id: number;
      full_name: string;
    } | null;
  }

  /** Work Type Request */
  export interface WorkTypeRequest {
    id: number;
    employee_id: {
      id: number;
      full_name: string;
      employee_profile: string | null;
      badge_id: string;
    };
    work_type_id: {
      id: number;
      work_type: string;
    };
    requested_date: string;
    requested_till: string | null;
    previous_work_type_id: {
      id: number;
      work_type: string;
    } | null;
    status: 'requested' | 'approved' | 'rejected' | 'cancelled';
    description: string | null;
    approved_by: {
      id: number;
      full_name: string;
    } | null;
  }

  /** Paginated Response - supports both backend formats */
  export interface PaginatedResponse<T> {
    // Backend format (FastVue)
    total?: number;
    items?: T[];
    page?: number;
    page_size?: number;
    // Legacy format (Django/HRMS style)
    count?: number;
    results?: T[];
    next?: string | null;
    previous?: string | null;
  }
}

// ==================== Companies ====================

/**
 * Get all companies
 */
export async function getCompaniesApi(params?: {
  page?: number;
  page_size?: number;
  parent_company?: number;
  hq_only?: boolean;
  branches_only?: boolean;
  is_active?: boolean;
  search?: string;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.Company>>(
    '/companies/',
    { params },
  );
}

/**
 * Get single company
 */
export async function getCompanyApi(id: number) {
  return requestClient.get<BaseApi.Company>(`/companies/${id}`);
}

/**
 * Create company
 */
export async function createCompanyApi(data: BaseApi.CompanyParams) {
  return requestClient.post<BaseApi.Company>('/companies/', data);
}

/**
 * Update company
 */
export async function updateCompanyApi(
  id: number,
  data: Partial<BaseApi.CompanyParams>,
) {
  return requestClient.put<BaseApi.Company>(`/companies/${id}`, data);
}

/**
 * Delete company
 */
export async function deleteCompanyApi(id: number) {
  return requestClient.delete(`/companies/${id}`);
}

/**
 * Get companies for switching
 */
export async function getCompanySwitchListApi() {
  return requestClient.get<BaseApi.Company[]>('/companies/switch-list');
}

/**
 * Switch to a company
 */
export async function switchCompanyApi(companyId: number) {
  return requestClient.post<{ message: string; company: BaseApi.Company }>(
    '/companies/switch',
    { company_id: companyId },
  );
}

/**
 * Clear company selection
 */
export async function clearCompanySelectionApi() {
  return requestClient.delete('/companies/switch');
}

// ==================== Departments ====================

/**
 * Get all departments
 */
export async function getDepartmentsApi(params?: {
  page?: number;
  page_size?: number;
  company_id?: number;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.Department>>(
    '/base/departments/',
    { params },
  );
}

/**
 * Get single department
 */
export async function getDepartmentApi(id: number) {
  return requestClient.get<BaseApi.Department>(`/base/departments/${id}/`);
}

/**
 * Create department
 */
export async function createDepartmentApi(data: {
  department: string;
  short_code?: string;
  department_manager_id?: number;
  parent_department?: number;
  company_id?: number;
}) {
  return requestClient.post<BaseApi.Department>('/base/departments/', data);
}

/**
 * Update department
 */
export async function updateDepartmentApi(
  id: number,
  data: Partial<{
    department: string;
    short_code: string;
    department_manager_id: number;
    parent_department: number;
  }>,
) {
  return requestClient.put<BaseApi.Department>(`/base/departments/${id}/`, data);
}

/**
 * Delete department
 */
export async function deleteDepartmentApi(id: number) {
  return requestClient.delete(`/base/departments/${id}/`);
}

// ==================== Job Positions ====================

/**
 * Get all job positions
 */
export async function getJobPositionsApi(params?: {
  page?: number;
  page_size?: number;
  department_id?: number;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.JobPosition>>(
    '/base/job-positions/',
    { params },
  );
}

/**
 * Get single job position
 */
export async function getJobPositionApi(id: number) {
  return requestClient.get<BaseApi.JobPosition>(`/base/job-positions/${id}/`);
}

/**
 * Create job position
 */
export async function createJobPositionApi(data: {
  job_position: string;
  department_id?: number;
}) {
  return requestClient.post<BaseApi.JobPosition>('/base/job-positions/', data);
}

/**
 * Update job position
 */
export async function updateJobPositionApi(
  id: number,
  data: Partial<{
    job_position: string;
    department_id: number;
  }>,
) {
  return requestClient.put<BaseApi.JobPosition>(
    `/base/job-positions/${id}/`,
    data,
  );
}

/**
 * Delete job position
 */
export async function deleteJobPositionApi(id: number) {
  return requestClient.delete(`/base/job-positions/${id}/`);
}

// ==================== Job Roles ====================

/**
 * Get all job roles
 */
export async function getJobRolesApi(params?: {
  page?: number;
  page_size?: number;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.JobRole>>(
    '/base/job-roles/',
    { params },
  );
}

/**
 * Create job role
 */
export async function createJobRoleApi(data: {
  job_role: string;
  job_position_id?: number;
}) {
  return requestClient.post<BaseApi.JobRole>('/base/job-roles/', data);
}

/**
 * Update job role
 */
export async function updateJobRoleApi(
  id: number,
  data: Partial<{
    job_role: string;
    job_position_id: number;
  }>,
) {
  return requestClient.put<BaseApi.JobRole>(`/base/job-roles/${id}/`, data);
}

/**
 * Delete job role
 */
export async function deleteJobRoleApi(id: number) {
  return requestClient.delete(`/base/job-roles/${id}/`);
}

// ==================== Work Types ====================

/**
 * Get all work types
 */
export async function getWorkTypesApi(params?: {
  page?: number;
  page_size?: number;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.WorkType>>(
    '/base/worktypes/',
    { params },
  );
}

/**
 * Create work type
 */
export async function createWorkTypeApi(data: {
  work_type: string;
  company_id?: number;
}) {
  return requestClient.post<BaseApi.WorkType>('/base/worktypes/', data);
}

/**
 * Update work type
 */
export async function updateWorkTypeApi(
  id: number,
  data: Partial<{
    work_type: string;
  }>,
) {
  return requestClient.put<BaseApi.WorkType>(`/base/worktypes/${id}/`, data);
}

/**
 * Delete work type
 */
export async function deleteWorkTypeApi(id: number) {
  return requestClient.delete(`/base/worktypes/${id}/`);
}

// ==================== Employee Shifts ====================

/**
 * Get all employee shifts
 */
export async function getEmployeeShiftsApi(params?: {
  page?: number;
  page_size?: number;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.EmployeeShift>>(
    '/base/employee-shift/',
    { params },
  );
}

/**
 * Get single employee shift
 */
export async function getEmployeeShiftApi(id: number) {
  return requestClient.get<BaseApi.EmployeeShift>(`/base/employee-shift/${id}/`);
}

/**
 * Create employee shift
 */
export async function createEmployeeShiftApi(data: {
  employee_shift: string;
  start_time: string;
  end_time: string;
  minimum_working_hour?: string;
  full_time?: string;
  grace_time?: string;
  is_night_shift?: boolean;
  company_id?: number;
}) {
  return requestClient.post<BaseApi.EmployeeShift>(
    '/base/employee-shift/',
    data,
  );
}

/**
 * Update employee shift
 */
export async function updateEmployeeShiftApi(
  id: number,
  data: Partial<{
    employee_shift: string;
    start_time: string;
    end_time: string;
    minimum_working_hour: string;
    full_time: string;
    grace_time: string;
    is_night_shift: boolean;
  }>,
) {
  return requestClient.put<BaseApi.EmployeeShift>(
    `/base/employee-shift/${id}/`,
    data,
  );
}

/**
 * Delete employee shift
 */
export async function deleteEmployeeShiftApi(id: number) {
  return requestClient.delete(`/base/employee-shift/${id}/`);
}

// ==================== Shift Schedules ====================

/**
 * Get shift schedules
 */
export async function getShiftSchedulesApi(params?: {
  page?: number;
  page_size?: number;
  shift_id?: number;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.ShiftSchedule>>(
    '/base/employee-shift-schedules/',
    { params },
  );
}

// ==================== Shift Requests ====================

/**
 * Get shift requests
 */
export async function getShiftRequestsApi(params?: {
  page?: number;
  page_size?: number;
  status?: string;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.ShiftRequest>>(
    '/base/shift-requests/',
    { params },
  );
}

/**
 * Create shift request
 */
export async function createShiftRequestApi(data: {
  shift_id: number;
  requested_date: string;
  requested_till?: string;
  description?: string;
}) {
  return requestClient.post<BaseApi.ShiftRequest>(
    '/base/shift-requests/',
    data,
  );
}

/**
 * Approve shift request
 */
export async function approveShiftRequestApi(id: number) {
  return requestClient.post(`/base/shift-request-approve/${id}/`);
}

/**
 * Reject shift request
 */
export async function rejectShiftRequestApi(id: number, reason?: string) {
  return requestClient.post(`/base/shift-request-reject/${id}/`, {
    reject_reason: reason,
  });
}

/**
 * Cancel shift request
 */
export async function cancelShiftRequestApi(id: number) {
  return requestClient.post(`/base/shift-request-cancel/${id}/`);
}

// ==================== Work Type Requests ====================

/**
 * Get work type requests
 */
export async function getWorkTypeRequestsApi(params?: {
  page?: number;
  page_size?: number;
  status?: string;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.WorkTypeRequest>>(
    '/base/worktype-requests/',
    { params },
  );
}

/**
 * Create work type request
 */
export async function createWorkTypeRequestApi(data: {
  work_type_id: number;
  requested_date: string;
  requested_till?: string;
  description?: string;
}) {
  return requestClient.post<BaseApi.WorkTypeRequest>(
    '/base/worktype-requests/',
    data,
  );
}

/**
 * Approve work type request
 */
export async function approveWorkTypeRequestApi(id: number) {
  return requestClient.post(`/base/worktype-request-approve/${id}/`);
}

/**
 * Reject work type request
 */
export async function rejectWorkTypeRequestApi(id: number, reason?: string) {
  return requestClient.post(`/base/worktype-request-reject/${id}/`, {
    reject_reason: reason,
  });
}

/**
 * Cancel work type request
 */
export async function cancelWorkTypeRequestApi(id: number) {
  return requestClient.post(`/base/worktype-request-cancel/${id}/`);
}

// ==================== Rotating Shifts ====================

/**
 * Get rotating shift assigns
 */
export async function getRotatingShiftAssignsApi(params?: {
  page?: number;
  page_size?: number;
}) {
  return requestClient.get<
    BaseApi.PaginatedResponse<BaseApi.RotatingShiftAssign>
  >('/base/rotating-shift-assign/', { params });
}

// ==================== Stage Definitions ====================

/**
 * Stage Definition Interface
 */
export interface StageDefinition {
  id: number;
  module: 'recruitment' | 'candidate' | 'interview' | 'onboarding' | 'offboarding';
  module_display: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  icon: string | null;
  sequence: number;
  stage_type: string;
  stage_type_display: string;
  is_initial: boolean;
  is_final: boolean;
  is_success: boolean;
  is_failure: boolean;
  is_active: boolean;
  is_system: boolean;
  company_id: number | null;
  company_name: string | null;
  managers: number[];
  manager_names: string[];
}

/**
 * Stage Definition Create/Update Params
 */
export interface StageDefinitionParams {
  module: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
  icon?: string;
  sequence?: number;
  stage_type?: string;
  is_initial?: boolean;
  is_final?: boolean;
  is_success?: boolean;
  is_failure?: boolean;
  is_active?: boolean;
  company_id?: number;
  managers?: number[];
}

/**
 * Get all stage definitions
 */
export async function getStageDefinitionsApi(params?: {
  module?: string;
}) {
  return requestClient.get<StageDefinition[]>('/base/stage-definitions/', { params });
}

/**
 * Get stage definitions by module
 */
export async function getStageDefinitionsByModuleApi(module: string) {
  return requestClient.get<StageDefinition[]>(`/base/stage-definitions/module/${module}/`);
}

/**
 * Get single stage definition
 */
export async function getStageDefinitionApi(id: number) {
  return requestClient.get<StageDefinition>(`/base/stage-definitions/${id}/`);
}

/**
 * Create stage definition
 */
export async function createStageDefinitionApi(data: StageDefinitionParams) {
  return requestClient.post<StageDefinition>('/base/stage-definitions/', data);
}

/**
 * Update stage definition
 */
export async function updateStageDefinitionApi(id: number, data: Partial<StageDefinitionParams>) {
  return requestClient.put<StageDefinition>(`/base/stage-definitions/${id}/`, data);
}

/**
 * Delete stage definition
 */
export async function deleteStageDefinitionApi(id: number) {
  return requestClient.delete(`/base/stage-definitions/${id}/`);
}

// ==================== Status Definitions ====================

/**
 * Status Definition Interface
 */
export interface StatusDefinition {
  id: number;
  module: 'attendance' | 'leave';
  module_display: string;
  name: string;
  code: string;
  sequence: number;
  color: string;
  is_initial: boolean;
  is_approved: boolean;
  is_rejected: boolean;
  is_cancelled: boolean;
  is_final: boolean;
  is_active: boolean;
  requires_approval: boolean;
  company_id: number | null;
  company_name: string | null;
}

/**
 * Status Definition Create/Update Params
 */
export interface StatusDefinitionParams {
  module: string;
  name: string;
  code: string;
  sequence?: number;
  color?: string;
  is_initial?: boolean;
  is_approved?: boolean;
  is_rejected?: boolean;
  is_cancelled?: boolean;
  is_final?: boolean;
  is_active?: boolean;
  requires_approval?: boolean;
  company_id?: number;
}

/**
 * Get all status definitions
 */
export async function getStatusDefinitionsApi(params?: {
  module?: string;
}) {
  return requestClient.get<StatusDefinition[]>('/base/status-definitions/', { params });
}

/**
 * Get status definitions by module
 */
export async function getStatusDefinitionsByModuleApi(module: string) {
  return requestClient.get<StatusDefinition[]>(`/base/status-definitions/module/${module}/`);
}

/**
 * Get single status definition
 */
export async function getStatusDefinitionApi(id: number) {
  return requestClient.get<StatusDefinition>(`/base/status-definitions/${id}/`);
}

/**
 * Create status definition
 */
export async function createStatusDefinitionApi(data: StatusDefinitionParams) {
  return requestClient.post<StatusDefinition>('/base/status-definitions/', data);
}

/**
 * Update status definition
 */
export async function updateStatusDefinitionApi(id: number, data: Partial<StatusDefinitionParams>) {
  return requestClient.put<StatusDefinition>(`/base/status-definitions/${id}/`, data);
}

/**
 * Delete status definition
 */
export async function deleteStatusDefinitionApi(id: number) {
  return requestClient.delete(`/base/status-definitions/${id}/`);
}

// ==================== Status Transitions ====================

/**
 * Status Transition Interface
 */
export interface StatusTransition {
  id: number;
  module: 'attendance' | 'leave';
  module_display: string;
  from_status_code: string;
  to_status_code: string;
  action_name: string;
  action_label: string;
  requires_comment: boolean;
  allowed_roles: string[];
  is_active: boolean;
  company_id: number | null;
  company_name: string | null;
}

/**
 * Status Transition Create/Update Params
 */
export interface StatusTransitionParams {
  module: string;
  from_status_code: string;
  to_status_code: string;
  action_name: string;
  action_label: string;
  requires_comment?: boolean;
  allowed_roles?: string[];
  is_active?: boolean;
  company_id?: number;
}

/**
 * Get all status transitions
 */
export async function getStatusTransitionsApi(params?: {
  module?: string;
}) {
  return requestClient.get<StatusTransition[]>('/base/status-transitions/', { params });
}

/**
 * Get single status transition
 */
export async function getStatusTransitionApi(id: number) {
  return requestClient.get<StatusTransition>(`/base/status-transitions/${id}/`);
}

/**
 * Create status transition
 */
export async function createStatusTransitionApi(data: StatusTransitionParams) {
  return requestClient.post<StatusTransition>('/base/status-transitions/', data);
}

/**
 * Update status transition
 */
export async function updateStatusTransitionApi(id: number, data: Partial<StatusTransitionParams>) {
  return requestClient.put<StatusTransition>(`/base/status-transitions/${id}/`, data);
}

/**
 * Delete status transition
 */
export async function deleteStatusTransitionApi(id: number) {
  return requestClient.delete(`/base/status-transitions/${id}/`);
}

/**
 * Initialize default stages for a company
 */
export async function initializeDefaultStagesApi(companyId: number) {
  return requestClient.post<{
    message: string;
    stages_created: number;
    statuses_created: number;
  }>('/base/initialize-default-stages/', { company_id: companyId });
}


// ============= Approval Workflow Types =============

/**
 * Approval Level
 */
export interface ApprovalLevel {
  id: number;
  workflow_id: number;
  level_order: number;
  name: string;
  description: string | null;
  approver_type: 'specific_user' | 'reporting_manager' | 'department_manager' | 'hr_manager' | 'role' | 'group' | 'dynamic';
  approver_id: number | null;
  approver_name: string | null;
  role_id: number | null;
  role_name: string | null;
  group_id: number | null;
  group_name: string | null;
  dynamic_approver_field: string | null;
  approval_mode: 'any' | 'all' | 'majority' | 'percentage';
  required_approvals: number;
  approval_percentage: number;
  timeout_hours: number | null;
  timeout_action: 'escalate' | 'auto_approve' | 'auto_reject' | 'remind' | null;
  escalate_to_id: number | null;
  can_delegate: boolean;
  is_active: boolean;
}

export interface ApprovalLevelParams {
  workflow_id: number;
  level_order: number;
  name: string;
  description?: string | null;
  approver_type: 'specific_user' | 'reporting_manager' | 'department_manager' | 'hr_manager' | 'role' | 'group' | 'dynamic';
  approver_id?: number | null;
  role_id?: number | null;
  group_id?: number | null;
  dynamic_approver_field?: string | null;
  approval_mode?: 'any' | 'all' | 'majority' | 'percentage';
  required_approvals?: number;
  approval_percentage?: number;
  timeout_hours?: number | null;
  timeout_action?: 'escalate' | 'auto_approve' | 'auto_reject' | 'remind' | null;
  escalate_to_id?: number | null;
  can_delegate?: boolean;
  is_active?: boolean;
}

/**
 * Approval Rule
 */
export interface ApprovalRule {
  id: number;
  workflow_id: number;
  name: string;
  description: string | null;
  priority: number;
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with' | 'between' | 'is_null' | 'is_not_null';
  value: string;
  value_type: 'string' | 'number' | 'boolean' | 'date' | 'list';
  logic_operator: 'AND' | 'OR';
  action: 'require_approval' | 'auto_approve' | 'auto_reject' | 'skip_level' | 'add_level' | 'notify';
  target_level_id: number | null;
  notify_users: number[];
  is_active: boolean;
}

export interface ApprovalRuleParams {
  workflow_id: number;
  name: string;
  description?: string | null;
  priority?: number;
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with' | 'between' | 'is_null' | 'is_not_null';
  value: string;
  value_type?: 'string' | 'number' | 'boolean' | 'date' | 'list';
  logic_operator?: 'AND' | 'OR';
  action: 'require_approval' | 'auto_approve' | 'auto_reject' | 'skip_level' | 'add_level' | 'notify';
  target_level_id?: number | null;
  notify_users?: number[];
  is_active?: boolean;
}

/**
 * Approval Workflow
 */
export interface ApprovalWorkflow {
  id: number;
  company_id: number | null;
  company_name: string | null;
  module: 'leave' | 'attendance' | 'expense' | 'timesheet' | 'recruitment' | 'onboarding' | 'offboarding' | 'asset' | 'payroll';
  name: string;
  description: string | null;
  approval_type: 'sequential' | 'parallel' | 'any';
  auto_approve_if_no_rules: boolean;
  notify_on_pending: boolean;
  notify_on_approved: boolean;
  notify_on_rejected: boolean;
  reminder_hours: number | null;
  max_reminders: number;
  escalation_hours: number | null;
  escalate_to_id: number | null;
  is_active: boolean;
  levels: ApprovalLevel[];
  rules: ApprovalRule[];
}

export interface ApprovalWorkflowParams {
  company_id?: number | null;
  module: 'leave' | 'attendance' | 'expense' | 'timesheet' | 'recruitment' | 'onboarding' | 'offboarding' | 'asset' | 'payroll';
  name: string;
  description?: string | null;
  approval_type?: 'sequential' | 'parallel' | 'any';
  auto_approve_if_no_rules?: boolean;
  notify_on_pending?: boolean;
  notify_on_approved?: boolean;
  notify_on_rejected?: boolean;
  reminder_hours?: number | null;
  max_reminders?: number;
  escalation_hours?: number | null;
  escalate_to_id?: number | null;
  is_active?: boolean;
}

/**
 * Approval Delegation
 */
export interface ApprovalDelegation {
  id: number;
  delegator_id: number;
  delegator_name: string | null;
  delegate_id: number;
  delegate_name: string | null;
  workflow_id: number | null;
  workflow_name: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  is_active: boolean;
}

export interface ApprovalDelegationParams {
  delegator_id: number;
  delegate_id: number;
  workflow_id?: number | null;
  start_date: string;
  end_date: string;
  reason?: string | null;
  is_active?: boolean;
}

/**
 * Approval Action
 */
export interface ApprovalAction {
  id: number;
  request_id: number;
  level_id: number | null;
  level_name: string | null;
  actor_id: number;
  actor_name: string | null;
  action: 'approve' | 'reject' | 'delegate' | 'escalate' | 'request_info' | 'provide_info' | 'cancel';
  comment: string | null;
  on_behalf_of_id: number | null;
  on_behalf_of_name: string | null;
  action_date: string;
  metadata: Record<string, unknown> | null;
}

/**
 * Approval Request
 */
export interface ApprovalRequest {
  id: number;
  workflow_id: number;
  workflow_name: string | null;
  module: string;
  object_id: number;
  requester: number;
  requester_name: string | null;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled' | 'escalated' | 'expired';
  current_level: number | null;
  current_level_name: string | null;
  submitted_at: string;
  completed_at: string | null;
  due_date: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string | null;
  metadata: Record<string, unknown> | null;
  company_id: number | null;
  company_name: string | null;
  actions: ApprovalAction[];
}

export interface ApprovalRequestParams {
  workflow_id: number;
  module: string;
  object_id: number;
  requester: number;
  due_date?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  company_id?: number | null;
}

// Extended BaseApi namespace for additional types
export namespace BaseApi {
  export interface ApprovalActionParams {
    action: 'approve' | 'reject' | 'delegate' | 'escalate' | 'request_info';
    comment?: string;
  }

  // Business Rules
  export interface BusinessRuleCondition {
    field: string;
    operator: string;
    value?: any;
    value_type: 'static' | 'field' | 'formula';
    value_field?: string;
  }

  export interface BusinessRuleAction {
    type: string;
    target_field?: string;
    value?: any;
    value_type?: 'static' | 'field' | 'formula';
    message?: string;
    chain_id?: number;
    template_id?: number;
    recipient_field?: string;
    url?: string;
    method?: string;
    transition_code?: string;
  }

  export interface BusinessRule {
    id: number;
    name: string;
    code: string;
    description?: string;
    entity_type: string;
    trigger_type: string;
    status_field?: string;
    from_status?: string;
    to_status?: string;
    conditions: BusinessRuleCondition[];
    condition_logic: 'and' | 'or';
    actions: BusinessRuleAction[];
    priority: number;
    stop_on_match: boolean;
    error_handling: 'continue' | 'stop' | 'rollback';
    is_active: boolean;
    company_id: number;
    created_at: string;
    updated_at?: string;
    success_count?: number;
    execution_count?: number;
  }

  export interface BusinessRuleParams {
    name: string;
    code: string;
    description?: string;
    entity_type: string;
    trigger_type: string;
    status_field?: string;
    from_status?: string;
    to_status?: string;
    conditions: BusinessRuleCondition[];
    condition_logic: 'and' | 'or';
    actions: BusinessRuleAction[];
    priority: number;
    stop_on_match: boolean;
    error_handling: 'continue' | 'stop' | 'rollback';
    is_active: boolean;
  }

  export interface BusinessRuleResponse {
    message: string;
    rule: BusinessRule;
  }

  export interface BusinessRuleTestParams {
    entity_data: Record<string, any>;
    old_entity_data?: Record<string, any>;
  }

  export interface BusinessRuleTestResult {
    conditions_matched: boolean;
    condition_results: Array<{
      condition_index: number;
      field: string;
      operator: string;
      expected_value: any;
      actual_value: any;
      result: boolean;
    }>;
    action_results: Array<{
      action_index: number;
      action_type: string;
      would_execute: boolean;
    }>;
    errors?: string[];
  }

  export interface RuleExecution {
    id: number;
    rule_id: number;
    entity_type: string;
    entity_id: number;
    trigger_type: string;
    conditions_matched: boolean;
    success: boolean;
    execution_time_ms: number;
    error_message?: string;
    created_at: string;
  }

  export interface RuleStats {
    total_rules: number;
    active_rules: number;
    total_executions: number;
    success_rate: number;
    rules_by_trigger: Record<string, number>;
  }

  // Approval Chains
  export interface ApprovalChain {
    id: number;
    name: string;
    code: string;
    description?: string;
    entity_type: string;
    chain_type: 'sequential' | 'parallel' | 'any_one';
    condition_domain?: any[];
    min_amount?: number;
    max_amount?: number;
    default_sla_hours: number;
    notify_on_pending: boolean;
    notify_on_complete: boolean;
    notification_template_id?: number;
    is_active: boolean;
    priority: number;
    company_id: number;
    created_by?: number;
    updated_by?: number;
    created_at: string;
    updated_at?: string;
    steps?: ApprovalStep[];
  }

  export interface ApprovalStep {
    id: number;
    chain_id: number;
    step_order: number;
    name: string;
    description?: string;
    approver_type: 'user' | 'role' | 'manager' | 'department_head' | 'dynamic' | 'group';
    approver_id?: number;
    approver_field?: string;
    required_count: number;
    allow_self_approval: boolean;
    sla_hours?: number;
    auto_approve_on_timeout: boolean;
    escalation_user_id?: number;
    skip_condition?: Record<string, any>;
    instructions?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
  }

  export interface ApprovalChainParams {
    name: string;
    code: string;
    description?: string;
    entity_type: string;
    chain_type?: 'sequential' | 'parallel' | 'any_one';
    condition_domain?: any[];
    min_amount?: number;
    max_amount?: number;
    default_sla_hours?: number;
    notify_on_pending?: boolean;
    notify_on_complete?: boolean;
    notification_template_id?: number;
    is_active?: boolean;
    priority?: number;
    steps?: Omit<ApprovalStep, 'id' | 'chain_id' | 'created_at' | 'updated_at'>[];
  }

  // Workflow Definitions
  export interface WorkflowState {
    code: string;
    name: string;
    sequence: number;
    is_start: boolean;
    is_end: boolean;
    color?: string;
  }

  export interface WorkflowDefinition {
    id: number;
    name: string;
    code: string;
    description?: string;
    module_name?: string;
    model_name: string;
    state_field: string;
    states: WorkflowState[];
    default_state?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
  }

  export interface WorkflowDefinitionParams {
    name: string;
    code: string;
    model_name: string;
    states: WorkflowState[];
    transitions?: any[];
    state_field?: string;
    default_state?: string;
    module_name?: string;
    description?: string;
    is_active?: boolean;
  }

  export interface WorkflowTransition {
    id: number;
    workflow_id: number;
    name: string;
    code: string;
    from_state: string;
    to_state: string;
    condition_domain: any[];
    condition_code?: string;
    required_groups: string[];
    action_id?: number;
    python_code?: string;
    button_name?: string;
    button_class: string;
    icon?: string;
    confirm_message?: string;
    sequence: number;
    is_active: boolean;
    created_at?: string;
  }

  export interface WorkflowVisualization {
    workflow_code: string;
    workflow_name: string;
    model_name: string;
    nodes: Array<{
      id: string;
      label: string;
      color?: string;
      is_start?: boolean;
      is_end?: boolean;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
    }>;
  }
}

// ============= Approval Workflow API Functions =============

/**
 * Get all approval workflows
 */
export async function getApprovalWorkflowsApi(params?: { company_id?: number; module?: string }) {
  return requestClient.get<ApprovalWorkflow[]>('/base/approval-workflows/', { params });
}

/**
 * Get approval workflows by module
 */
export async function getApprovalWorkflowsByModuleApi(module: string, companyId?: number) {
  return requestClient.get<ApprovalWorkflow[]>(`/base/approval-workflows/module/${module}/`, {
    params: companyId ? { company_id: companyId } : undefined,
  });
}

/**
 * Get single approval workflow
 */
export async function getApprovalWorkflowApi(id: number) {
  return requestClient.get<ApprovalWorkflow>(`/base/approval-workflows/${id}/`);
}

/**
 * Create approval workflow
 */
export async function createApprovalWorkflowApi(data: ApprovalWorkflowParams) {
  return requestClient.post<ApprovalWorkflow>('/base/approval-workflows/', data);
}

/**
 * Update approval workflow
 */
export async function updateApprovalWorkflowApi(id: number, data: Partial<ApprovalWorkflowParams>) {
  return requestClient.put<ApprovalWorkflow>(`/base/approval-workflows/${id}/`, data);
}

/**
 * Delete approval workflow
 */
export async function deleteApprovalWorkflowApi(id: number) {
  return requestClient.delete(`/base/approval-workflows/${id}/`);
}

/**
 * Get all approval levels
 */
export async function getApprovalLevelsApi(workflowId?: number) {
  return requestClient.get<ApprovalLevel[]>('/base/approval-levels/', {
    params: workflowId ? { workflow_id: workflowId } : undefined,
  });
}

/**
 * Get single approval level
 */
export async function getApprovalLevelApi(id: number) {
  return requestClient.get<ApprovalLevel>(`/base/approval-levels/${id}/`);
}

/**
 * Create approval level
 */
export async function createApprovalLevelApi(data: ApprovalLevelParams) {
  return requestClient.post<ApprovalLevel>('/base/approval-levels/', data);
}

/**
 * Update approval level
 */
export async function updateApprovalLevelApi(id: number, data: Partial<ApprovalLevelParams>) {
  return requestClient.put<ApprovalLevel>(`/base/approval-levels/${id}/`, data);
}

/**
 * Delete approval level
 */
export async function deleteApprovalLevelApi(id: number) {
  return requestClient.delete(`/base/approval-levels/${id}/`);
}

/**
 * Get all approval rules
 */
export async function getApprovalRulesApi(workflowId?: number) {
  return requestClient.get<ApprovalRule[]>('/base/approval-rules/', {
    params: workflowId ? { workflow_id: workflowId } : undefined,
  });
}

/**
 * Get single approval rule
 */
export async function getApprovalRuleApi(id: number) {
  return requestClient.get<ApprovalRule>(`/base/approval-rules/${id}/`);
}

/**
 * Create approval rule
 */
export async function createApprovalRuleApi(data: ApprovalRuleParams) {
  return requestClient.post<ApprovalRule>('/base/approval-rules/', data);
}

/**
 * Update approval rule
 */
export async function updateApprovalRuleApi(id: number, data: Partial<ApprovalRuleParams>) {
  return requestClient.put<ApprovalRule>(`/base/approval-rules/${id}/`, data);
}

/**
 * Delete approval rule
 */
export async function deleteApprovalRuleApi(id: number) {
  return requestClient.delete(`/base/approval-rules/${id}/`);
}

/**
 * Get all approval delegations
 */
export async function getApprovalDelegationsApi(params?: { delegator_id?: number; delegate_id?: number }) {
  return requestClient.get<ApprovalDelegation[]>('/base/approval-delegations/', { params });
}

/**
 * Get single approval delegation
 */
export async function getApprovalDelegationApi(id: number) {
  return requestClient.get<ApprovalDelegation>(`/base/approval-delegations/${id}/`);
}

/**
 * Create approval delegation
 */
export async function createApprovalDelegationApi(data: ApprovalDelegationParams) {
  return requestClient.post<ApprovalDelegation>('/base/approval-delegations/', data);
}

/**
 * Update approval delegation
 */
export async function updateApprovalDelegationApi(id: number, data: Partial<ApprovalDelegationParams>) {
  return requestClient.put<ApprovalDelegation>(`/base/approval-delegations/${id}/`, data);
}

/**
 * Delete approval delegation
 */
export async function deleteApprovalDelegationApi(id: number) {
  return requestClient.delete(`/base/approval-delegations/${id}/`);
}

/**
 * Get approval requests
 */
export async function getApprovalRequestsApi(params?: {
  status?: string;
  module?: string;
  requester_id?: number;
  company_id?: number;
}) {
  return requestClient.get<{ count: number; results: ApprovalRequest[] }>('/base/approval-requests/', { params });
}

/**
 * Get pending approval requests for current user
 */
export async function getPendingApprovalRequestsApi() {
  return requestClient.get<ApprovalRequest[]>('/base/approval-requests/pending/');
}

/**
 * Get single approval request
 */
export async function getApprovalRequestApi(id: number) {
  return requestClient.get<ApprovalRequest>(`/base/approval-requests/${id}/`);
}

/**
 * Create approval request
 */
export async function createApprovalRequestApi(data: ApprovalRequestParams) {
  return requestClient.post<ApprovalRequest>('/base/approval-requests/', data);
}

/**
 * Process approval action (approve/reject/delegate/escalate)
 */
export async function processApprovalActionApi(requestId: number, data: BaseApi.ApprovalActionParams) {
  return requestClient.post<ApprovalRequest>(`/base/approval-requests/${requestId}/action/`, data);
}

/**
 * Initialize default approval workflows for a company
 */
export async function initializeApprovalWorkflowsApi(companyId: number) {
  return requestClient.post<{
    message: string;
    workflows_created: number;
  }>(`/base/initialize-approval-workflows/${companyId}/`);
}

// ==================== Business Rules ====================

/**
 * Get all business rules
 */
export async function getBusinessRulesApi(params?: {
  page?: number;
  page_size?: number;
  search?: string;
  entity_type?: string;
  trigger_type?: string;
  is_active?: boolean;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.BusinessRule>>('/base/rules/', { params });
}

/**
 * Get single business rule
 */
export async function getBusinessRuleApi(id: number) {
  return requestClient.get<BaseApi.BusinessRule>(`/base/rules/${id}/`);
}

/**
 * Create business rule
 */
export async function createBusinessRuleApi(data: BaseApi.BusinessRuleParams) {
  return requestClient.post<BaseApi.BusinessRule>('/base/rules/', data);
}

/**
 * Update business rule
 */
export async function updateBusinessRuleApi(id: number, data: Partial<BaseApi.BusinessRuleParams>) {
  return requestClient.put<BaseApi.BusinessRule>(`/base/rules/${id}/`, data);
}

/**
 * Delete business rule
 */
export async function deleteBusinessRuleApi(id: number) {
  return requestClient.delete(`/base/rules/${id}/`);
}

/**
 * Toggle business rule active/inactive
 */
export async function toggleBusinessRuleApi(id: number) {
  return requestClient.post<BaseApi.BusinessRuleResponse>(`/base/rules/${id}/toggle/`);
}

/**
 * Test business rule
 */
export async function testBusinessRuleApi(id: number, data: BaseApi.BusinessRuleTestParams) {
  return requestClient.post<BaseApi.BusinessRuleTestResult>(`/base/rules/${id}/test/`, data);
}

/**
 * Get business rule executions
 */
export async function getBusinessRuleExecutionsApi(id: number, params?: {
  page?: number;
  page_size?: number;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.RuleExecution>>(`/base/rules/${id}/executions/`, { params });
}

/**
 * Get business rules statistics
 */
export async function getBusinessRulesStatsApi() {
  return requestClient.get<BaseApi.RuleStats>('/base/rules/stats/');
}

// ==================== Workflow Definitions ====================

/**
 * Get all workflow definitions
 */
export async function getWorkflowDefinitionsApi(params?: {
  module_name?: string;
  model_name?: string;
  active_only?: boolean;
}) {
  return requestClient.get<BaseApi.WorkflowDefinition[]>('/base/workflows/', { params });
}

/**
 * Get single workflow definition by code
 */
export async function getWorkflowDefinitionApi(code: string) {
  return requestClient.get<BaseApi.WorkflowDefinition>(`/base/workflows/${code}`);
}

/**
 * Create workflow definition
 */
export async function createWorkflowDefinitionApi(data: BaseApi.WorkflowDefinitionParams) {
  return requestClient.post<BaseApi.WorkflowDefinition>('/base/workflows/', data);
}

/**
 * Update workflow definition
 */
export async function updateWorkflowDefinitionApi(code: string, data: Partial<BaseApi.WorkflowDefinitionParams>) {
  return requestClient.put<BaseApi.WorkflowDefinition>(`/base/workflows/${code}`, data);
}

/**
 * Delete workflow definition
 */
export async function deleteWorkflowDefinitionApi(code: string) {
  return requestClient.delete(`/base/workflows/${code}`);
}

/**
 * Get workflow transitions
 */
export async function getWorkflowTransitionsApi(code: string, params?: {
  from_state?: string;
  active_only?: boolean;
}) {
  return requestClient.get<BaseApi.WorkflowTransition[]>(`/base/workflows/${code}/transitions`, { params });
}

/**
 * Get workflow visualization data
 */
export async function getWorkflowVisualizationApi(code: string) {
  return requestClient.get<BaseApi.WorkflowVisualization>(`/base/workflows/${code}/visualization`);
}

// ==================== Approval Chains ====================

/**
 * Get all approval chains
 */
export async function getApprovalChainsApi(params?: {
  page?: number;
  page_size?: number;
  entity_type?: string;
  active_only?: boolean;
}) {
  return requestClient.get<BaseApi.PaginatedResponse<BaseApi.ApprovalChain>>('/base/approval-chains/', { params });
}

/**
 * Get single approval chain by ID
 */
export async function getApprovalChainApi(id: number) {
  return requestClient.get<BaseApi.ApprovalChain>(`/base/approval-chains/${id}`);
}

/**
 * Create approval chain
 */
export async function createApprovalChainApi(data: BaseApi.ApprovalChainParams) {
  return requestClient.post<BaseApi.ApprovalChain>('/base/approval-chains/', data);
}

/**
 * Update approval chain
 */
export async function updateApprovalChainApi(id: number, data: Partial<BaseApi.ApprovalChainParams>) {
  return requestClient.put<BaseApi.ApprovalChain>(`/base/approval-chains/${id}`, data);
}

/**
 * Delete approval chain
 */
export async function deleteApprovalChainApi(id: number) {
  return requestClient.delete(`/base/approval-chains/${id}`);
}
