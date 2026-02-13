import { requestClient } from '#/api/request';

/**
 * Security API Namespace - Security Settings, 2FA, RLS, ACL
 */
export namespace SecurityApi {
  // =============================================================================
  // SECURITY SETTINGS
  // =============================================================================

  /** Security settings for a user */
  export interface SecuritySetting {
    id: number;
    user_id: number;
    two_factor_enabled: boolean;
    require_password_change: boolean;
    password_expiry_days: number;
    max_login_attempts: number;
    lockout_duration_minutes: number;
    max_session_duration_hours: number;
    allow_concurrent_sessions: boolean;
    max_concurrent_sessions: number;
    email_on_login: boolean;
    email_on_password_change: boolean;
    email_on_security_change: boolean;
    email_on_suspicious_activity: boolean;
    activity_logging_enabled: boolean;
    data_retention_days: number;
    api_access_enabled: boolean;
    api_rate_limit: number;
    created_at: string;
    updated_at: string | null;
  }

  /** Security settings update params */
  export interface SecuritySettingUpdate {
    require_password_change?: boolean;
    password_expiry_days?: number;
    max_login_attempts?: number;
    lockout_duration_minutes?: number;
    max_session_duration_hours?: number;
    allow_concurrent_sessions?: boolean;
    max_concurrent_sessions?: number;
    email_on_login?: boolean;
    email_on_password_change?: boolean;
    email_on_security_change?: boolean;
    email_on_suspicious_activity?: boolean;
    activity_logging_enabled?: boolean;
    data_retention_days?: number;
    api_access_enabled?: boolean;
    api_rate_limit?: number;
  }

  /** Security overview response */
  export interface SecurityOverview {
    user_id: number;
    two_factor_enabled: boolean;
    password_strength_score: number;
    last_password_change: string | null;
    active_sessions_count: number;
    recent_login_attempts: number;
    security_score: number;
    recommendations: string[];
  }

  /** 2FA Setup response */
  export interface TwoFactorSetup {
    secret: string;
    qr_code_url: string;
    backup_codes: string[];
  }

  /** 2FA Verify request */
  export interface TwoFactorVerify {
    token: string;
  }

  /** 2FA Disable request */
  export interface TwoFactorDisable {
    password: string;
    token?: string;
  }

  // =============================================================================
  // ROW LEVEL SECURITY (RLS)
  // =============================================================================

  /** RLS Entity types */
  export type RLSEntityType =
    | 'USER'
    | 'COMPANY'
    | 'ROLE'
    | 'GROUP'
    | 'PERMISSION'
    | 'DOCUMENT'
    | 'RECORD';

  /** RLS Actions */
  export type RLSAction = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';

  /** RLS Policy types */
  export type RLSPolicyType = 'PERMISSIVE' | 'RESTRICTIVE';

  /** RLS Policy */
  export interface RLSPolicy {
    id: number;
    name: string;
    description: string | null;
    entity_type: RLSEntityType;
    table_name: string;
    policy_type: RLSPolicyType;
    action: RLSAction;
    condition_column: string | null;
    condition_value_source: string | null;
    custom_condition: string | null;
    required_roles: string[];
    required_permissions: string[];
    priority: number;
    organization_id: number | null;
    is_active: boolean;
    created_by: number;
    created_at: string;
    updated_at: string | null;
  }

  /** RLS Policy create params */
  export interface RLSPolicyCreate {
    name: string;
    description?: string;
    entity_type: RLSEntityType;
    table_name: string;
    policy_type: RLSPolicyType;
    action: RLSAction;
    condition_column?: string;
    condition_value_source?: string;
    custom_condition?: string;
    required_roles?: string[];
    required_permissions?: string[];
    priority?: number;
    organization_id?: number;
  }

  /** RLS Policy update params */
  export interface RLSPolicyUpdate {
    name?: string;
    description?: string;
    policy_type?: RLSPolicyType;
    action?: RLSAction;
    condition_column?: string;
    condition_value_source?: string;
    custom_condition?: string;
    required_roles?: string[];
    required_permissions?: string[];
    priority?: number;
    is_active?: boolean;
  }

  /** RLS Rule Assignment */
  export interface RLSRuleAssignment {
    id: number;
    policy_id: number;
    entity_type: RLSEntityType;
    entity_id: string;
    user_id: number | null;
    role_id: number | null;
    conditions: Record<string, any>;
    is_active: boolean;
    created_by: number;
    created_at: string;
  }

  /** RLS Rule Assignment create params */
  export interface RLSRuleAssignmentCreate {
    policy_id: number;
    entity_type: RLSEntityType;
    entity_id: string;
    user_id?: number;
    role_id?: number;
    conditions?: Record<string, any>;
  }

  /** RLS Audit Log */
  export interface RLSAuditLog {
    id: number;
    user_id: number;
    session_id: string;
    entity_type: RLSEntityType;
    entity_id: string | null;
    table_name: string | null;
    action: RLSAction;
    access_granted: boolean;
    denial_reason: string | null;
    policy_id: number | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
  }

  /** RLS Audit Stats */
  export interface RLSAuditStats {
    period_days: number;
    total_attempts: number;
    granted_count: number;
    denied_count: number;
    success_rate: number;
    top_denied_reasons: Array<{ reason: string; count: number }>;
    entity_type_stats: Array<{ entity_type: string; count: number }>;
  }

  /** RLS Access Check request */
  export interface RLSAccessCheckRequest {
    entity_type: RLSEntityType;
    action: RLSAction;
    entity_id?: string;
    table_name?: string;
  }

  /** RLS Access Check response */
  export interface RLSAccessCheckResponse {
    access_granted: boolean;
    denial_reason: string | null;
    entity_type: RLSEntityType;
    action: RLSAction;
    entity_id: string | null;
    checked_at: string;
  }

  /** Organization */
  export interface Organization {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    settings: Record<string, any>;
    rls_enabled: boolean;
    is_active: boolean;
    created_by: number;
    created_at: string;
    updated_at: string | null;
  }

  /** Organization create params */
  export interface OrganizationCreate {
    name: string;
    slug: string;
    description?: string;
    settings?: Record<string, any>;
    rls_enabled?: boolean;
  }

  // =============================================================================
  // ACCESS CONTROL LISTS (ACL)
  // =============================================================================

  /** ACL Entry */
  export interface ACL {
    id: number;
    name: string;
    description: string | null;
    entity_type: string;
    operation: string;
    field_name: string | null;
    condition_script: string | null;
    condition_context: Record<string, any>;
    allowed_roles: string[];
    denied_roles: string[];
    allowed_users: number[];
    denied_users: number[];
    requires_approval: boolean;
    approval_workflow_id: number | null;
    priority: number;
    is_active: boolean;
    created_by: number;
    created_at: string;
    updated_at: string | null;
  }

  /** ACL create params */
  export interface ACLCreate {
    name: string;
    description?: string;
    entity_type: string;
    operation: string;
    field_name?: string;
    condition_script?: string;
    condition_context?: Record<string, any>;
    allowed_roles?: string[];
    denied_roles?: string[];
    allowed_users?: number[];
    denied_users?: number[];
    requires_approval?: boolean;
    approval_workflow_id?: number;
    priority?: number;
    is_active?: boolean;
  }

  /** ACL update params */
  export interface ACLUpdate {
    name?: string;
    description?: string;
    condition_script?: string;
    condition_context?: Record<string, any>;
    allowed_roles?: string[];
    denied_roles?: string[];
    allowed_users?: number[];
    denied_users?: number[];
    requires_approval?: boolean;
    approval_workflow_id?: number;
    priority?: number;
    is_active?: boolean;
  }

  /** Record Permission */
  export interface RecordPermission {
    id: number;
    entity_type: string;
    entity_id: string;
    user_id: number | null;
    role_id: number | null;
    operation: string;
    expires_at: string | null;
    conditions: Record<string, any>;
    granted_by: number;
    granted_at: string;
    is_active: boolean;
    revoked_by: number | null;
    revoked_at: string | null;
  }

  /** Record Permission create params */
  export interface RecordPermissionCreate {
    entity_type: string;
    entity_id: string;
    user_id?: number;
    role_id?: number;
    operation: string;
    expires_at?: string;
    conditions?: Record<string, any>;
  }

  /** Permission check request */
  export interface PermissionCheckRequest {
    entity_type: string;
    entity_id?: string;
    operation: string;
    field_name?: string;
    entity_data?: Record<string, any>;
  }

  /** Permission check response */
  export interface PermissionCheckResponse {
    has_access: boolean;
    reason: string;
    applicable_acls: string[] | null;
  }

  /** List response wrapper */
  export interface ListResponse<T> {
    items: T[];
    total: number;
    page: number;
    pages: number;
    size: number;
  }

  // =============================================================================
  // CSP (Content Security Policy)
  // =============================================================================

  /** CSP Status response */
  export interface CSPStatus {
    status: string;
    csp_header: string;
    directives: Record<string, string>;
    report_uri: string;
    timestamp: string;
  }
}

// =============================================================================
// SECURITY SETTINGS API
// =============================================================================

/**
 * Get current user's security settings
 */
export async function getSecuritySettingsApi() {
  return requestClient.get<SecurityApi.SecuritySetting>('/security/settings');
}

/**
 * Update security settings
 */
export async function updateSecuritySettingsApi(
  data: SecurityApi.SecuritySettingUpdate,
) {
  return requestClient.put<SecurityApi.SecuritySetting>(
    '/security/settings',
    data,
  );
}

/**
 * Get security overview
 */
export async function getSecurityOverviewApi() {
  return requestClient.get<SecurityApi.SecurityOverview>('/security/overview');
}

/**
 * Setup 2FA
 */
export async function setup2FAApi() {
  return requestClient.post<SecurityApi.TwoFactorSetup>('/security/2fa/setup');
}

/**
 * Verify and enable 2FA
 */
export async function verify2FAApi(data: SecurityApi.TwoFactorVerify) {
  return requestClient.post<{ message: string }>('/security/2fa/verify', data);
}

/**
 * Disable 2FA
 */
export async function disable2FAApi(data: SecurityApi.TwoFactorDisable) {
  return requestClient.post<{ message: string }>('/security/2fa/disable', data);
}

/**
 * Report security violation
 */
export async function reportSecurityViolationApi(data: {
  type: string;
  details: Record<string, any>;
  timestamp?: string;
  userAgent?: string;
  url?: string;
}) {
  return requestClient.post<{ status: string; message: string }>(
    '/security/violations',
    data,
  );
}

// =============================================================================
// RLS POLICIES API
// =============================================================================

/**
 * Get RLS policies list
 */
export async function getRLSPoliciesApi(params?: {
  entity_type?: SecurityApi.RLSEntityType;
  action?: SecurityApi.RLSAction;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}) {
  return requestClient.get<SecurityApi.RLSPolicy[]>('/rls/policies', {
    params,
  });
}

/**
 * Get RLS policy by ID
 */
export async function getRLSPolicyApi(id: number) {
  return requestClient.get<SecurityApi.RLSPolicy>(`/rls/policies/${id}`);
}

/**
 * Create RLS policy
 */
export async function createRLSPolicyApi(data: SecurityApi.RLSPolicyCreate) {
  return requestClient.post<SecurityApi.RLSPolicy>('/rls/policies', data);
}

/**
 * Update RLS policy
 */
export async function updateRLSPolicyApi(
  id: number,
  data: SecurityApi.RLSPolicyUpdate,
) {
  return requestClient.put<SecurityApi.RLSPolicy>(`/rls/policies/${id}`, data);
}

/**
 * Delete RLS policy
 */
export async function deleteRLSPolicyApi(id: number) {
  return requestClient.delete<{ message: string }>(`/rls/policies/${id}`);
}

// =============================================================================
// RLS RULE ASSIGNMENTS API
// =============================================================================

/**
 * Get RLS rule assignments
 */
export async function getRLSRuleAssignmentsApi(params?: {
  policy_id?: number;
  user_id?: number;
  entity_type?: SecurityApi.RLSEntityType;
  skip?: number;
  limit?: number;
}) {
  return requestClient.get<SecurityApi.RLSRuleAssignment[]>(
    '/rls/rule-assignments',
    { params },
  );
}

/**
 * Create RLS rule assignment
 */
export async function createRLSRuleAssignmentApi(
  data: SecurityApi.RLSRuleAssignmentCreate,
) {
  return requestClient.post<SecurityApi.RLSRuleAssignment>(
    '/rls/rule-assignments',
    data,
  );
}

// =============================================================================
// RLS AUDIT API
// =============================================================================

/**
 * Get RLS audit logs
 */
export async function getRLSAuditLogsApi(params?: {
  user_id?: number;
  entity_type?: SecurityApi.RLSEntityType;
  action?: SecurityApi.RLSAction;
  access_granted?: boolean;
  from_date?: string;
  to_date?: string;
  skip?: number;
  limit?: number;
}) {
  return requestClient.get<SecurityApi.RLSAuditLog[]>('/rls/audit-logs', {
    params,
  });
}

/**
 * Get RLS audit stats
 */
export async function getRLSAuditStatsApi(days?: number) {
  return requestClient.get<SecurityApi.RLSAuditStats>('/rls/audit-logs/stats', {
    params: { days },
  });
}

/**
 * Check RLS access
 */
export async function checkRLSAccessApi(
  data: SecurityApi.RLSAccessCheckRequest,
) {
  return requestClient.post<SecurityApi.RLSAccessCheckResponse>(
    '/rls/check-access',
    data,
  );
}

// =============================================================================
// RLS ORGANIZATIONS API
// =============================================================================

/**
 * Get organizations list
 */
export async function getOrganizationsApi(params?: {
  skip?: number;
  limit?: number;
}) {
  return requestClient.get<SecurityApi.Organization[]>('/rls/organizations', {
    params,
  });
}

/**
 * Create organization
 */
export async function createOrganizationApi(
  data: SecurityApi.OrganizationCreate,
) {
  return requestClient.post<SecurityApi.Organization>(
    '/rls/organizations',
    data,
  );
}

// =============================================================================
// ACL API
// =============================================================================

/**
 * Get ACLs list
 */
export async function getACLsApi(params?: {
  entity_type?: string;
  operation?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}) {
  return requestClient.get<SecurityApi.ListResponse<SecurityApi.ACL>>(
    '/acls/',
    { params },
  );
}

/**
 * Get ACL by ID
 */
export async function getACLApi(id: number) {
  return requestClient.get<SecurityApi.ACL>(`/acls/${id}`);
}

/**
 * Create ACL
 */
export async function createACLApi(data: SecurityApi.ACLCreate) {
  return requestClient.post<SecurityApi.ACL>('/acls/', data);
}

/**
 * Update ACL
 */
export async function updateACLApi(id: number, data: SecurityApi.ACLUpdate) {
  return requestClient.put<SecurityApi.ACL>(`/acls/${id}`, data);
}

/**
 * Delete ACL
 */
export async function deleteACLApi(id: number) {
  return requestClient.delete<{ message: string }>(`/acls/${id}`);
}

// =============================================================================
// RECORD PERMISSIONS API
// =============================================================================

/**
 * Get record permissions
 */
export async function getRecordPermissionsApi(params?: {
  entity_type?: string;
  entity_id?: string;
  user_id?: number;
  operation?: string;
  skip?: number;
  limit?: number;
}) {
  return requestClient.get<
    SecurityApi.ListResponse<SecurityApi.RecordPermission>
  >('/acls/record-permissions', { params });
}

/**
 * Create record permission
 */
export async function createRecordPermissionApi(
  data: SecurityApi.RecordPermissionCreate,
) {
  return requestClient.post<SecurityApi.RecordPermission>(
    '/acls/record-permissions',
    data,
  );
}

/**
 * Revoke record permission
 */
export async function revokeRecordPermissionApi(id: number) {
  return requestClient.delete<{ message: string }>(
    `/acls/record-permissions/${id}`,
  );
}

/**
 * Check permission
 */
export async function checkACLPermissionApi(
  data: SecurityApi.PermissionCheckRequest,
) {
  return requestClient.post<SecurityApi.PermissionCheckResponse>(
    '/acls/check-permission',
    data,
  );
}

/**
 * Get user's record permissions
 */
export async function getUserRecordPermissionsApi(params?: {
  entity_type?: string;
  entity_id?: string;
}) {
  return requestClient.get<{
    user_id: number;
    permissions: Array<{
      id: number;
      entity_type: string;
      entity_id: string;
      operation: string;
      granted_at: string;
      expires_at: string | null;
      conditions: Record<string, any>;
    }>;
  }>('/acls/user-permissions', { params });
}

// =============================================================================
// CSP API
// =============================================================================

/**
 * Get CSP status
 */
export async function getCSPStatusApi() {
  return requestClient.get<SecurityApi.CSPStatus>('/csp/csp-status');
}

// =============================================================================
// PER-USER SECURITY SETTINGS API
// =============================================================================

/** Per-user security settings */
export interface UserSecuritySettings {
  id: number;
  user_id: number;
  // 2FA
  two_factor_required: boolean;
  two_factor_methods: string[];
  backup_codes_remaining: number;
  // API
  api_access_enabled: boolean;
  api_rate_limit_per_hour: number;
  api_rate_limit_per_minute: number;
  api_key_enabled: boolean;
  api_key_prefix: string | null;
  api_key_expires_at: string | null;
  // Session
  max_concurrent_sessions: number;
  session_timeout_minutes: number;
  require_session_ip_binding: boolean;
  allowed_session_ips: string[];
  // Login
  max_failed_login_attempts: number;
  lockout_duration_minutes: number;
  require_captcha_after_failures: number;
  // Password
  password_expires_days: number;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_numbers: boolean;
  password_require_special: boolean;
  password_history_count: number;
  // Time restrictions
  login_hours_enabled: boolean;
  login_hours_start: string | null;
  login_hours_end: string | null;
  login_hours_timezone: string;
  login_days_allowed: number[];
  // IP restrictions
  allowed_login_ips: string[];
  blocked_login_ips: string[];
  // Notifications
  notify_on_login: boolean;
  notify_on_failed_login: boolean;
  notify_on_password_change: boolean;
  notify_on_2fa_change: boolean;
  notify_on_new_device: boolean;
  // Activity
  activity_logging_enabled: boolean;
  // Admin
  admin_locked: boolean;
  admin_lock_reason?: string | null;
  admin_notes?: string | null;
  settings_locked: boolean;
  applied_policy_id?: number | null;
  applied_policy_at?: string | null;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

/** User security settings update params */
export interface UserSecuritySettingsUpdate {
  two_factor_required?: boolean;
  two_factor_methods?: string[];
  api_access_enabled?: boolean;
  api_rate_limit_per_hour?: number;
  api_rate_limit_per_minute?: number;
  api_key_enabled?: boolean;
  max_concurrent_sessions?: number;
  session_timeout_minutes?: number;
  require_session_ip_binding?: boolean;
  allowed_session_ips?: string[];
  max_failed_login_attempts?: number;
  lockout_duration_minutes?: number;
  require_captcha_after_failures?: number;
  password_expires_days?: number;
  password_min_length?: number;
  password_require_uppercase?: boolean;
  password_require_lowercase?: boolean;
  password_require_numbers?: boolean;
  password_require_special?: boolean;
  password_history_count?: number;
  login_hours_enabled?: boolean;
  login_hours_start?: string | null;
  login_hours_end?: string | null;
  login_hours_timezone?: string;
  login_days_allowed?: number[];
  allowed_login_ips?: string[];
  blocked_login_ips?: string[];
  notify_on_login?: boolean;
  notify_on_failed_login?: boolean;
  notify_on_password_change?: boolean;
  notify_on_2fa_change?: boolean;
  notify_on_new_device?: boolean;
  activity_logging_enabled?: boolean;
  admin_locked?: boolean;
  admin_lock_reason?: string | null;
  admin_notes?: string | null;
  settings_locked?: boolean;
}

/** User security score */
export interface UserSecurityScore {
  overall_score: number;
  two_factor_score: number;
  password_score: number;
  session_score: number;
  activity_score: number;
  risk_factors: string[];
  recommendations: string[];
}

/**
 * Get a user's security settings (admin)
 */
export async function getUserSecuritySettingsApi(userId: number) {
  return requestClient.get<UserSecuritySettings>(
    `/user-security/users/${userId}/settings`,
  );
}

/**
 * Update a user's security settings (admin)
 */
export async function updateUserSecuritySettingsApi(
  userId: number,
  data: UserSecuritySettingsUpdate,
) {
  return requestClient.put<UserSecuritySettings>(
    `/user-security/users/${userId}/settings`,
    data,
  );
}

/**
 * Get a user's security score (admin)
 */
export async function getUserSecurityScoreApi(userId: number) {
  return requestClient.get<UserSecurityScore>(
    `/user-security/users/${userId}/score`,
  );
}

/**
 * Force 2FA for a user (admin)
 */
export async function forceUser2FAApi(userId: number) {
  return requestClient.post(`/user-security/users/${userId}/force-2fa`);
}

/**
 * Reset 2FA for a user (admin)
 */
export async function resetUser2FAApi(
  userId: number,
  data: { user_id: number; reason: string },
) {
  return requestClient.post(`/user-security/users/${userId}/reset-2fa`, data);
}

/**
 * Lock a user account (admin)
 */
export async function lockUserAccountApi(
  userId: number,
  data: { user_id: number; reason: string },
) {
  return requestClient.post(`/user-security/users/${userId}/lock`, data);
}

/**
 * Unlock a user account (admin)
 */
export async function unlockUserAccountApi(userId: number) {
  return requestClient.post(`/user-security/users/${userId}/unlock`);
}

/**
 * Terminate all sessions for a user (admin)
 */
export async function terminateUserSessionsApi(
  userId: number,
  data?: { reason?: string },
) {
  return requestClient.post(
    `/user-security/users/${userId}/terminate-sessions`,
    data,
  );
}

/**
 * Bulk force 2FA for multiple users (admin)
 */
export async function bulkForce2FAApi(userIds: number[]) {
  return requestClient.post<{
    success_count: number;
    failure_count: number;
    details: Array<{ user_id: number; status?: string; error?: string }>;
  }>('/user-security/bulk/force-2fa', { user_ids: userIds });
}

/**
 * Get security compliance report (admin)
 */
export async function getSecurityComplianceReportApi() {
  return requestClient.get<{
    total_users: number;
    two_factor_enabled_count: number;
    two_factor_enabled_percentage: number;
    password_expired_count: number;
    locked_accounts_count: number;
    inactive_users_count: number;
    high_risk_users: Array<{ user_id: number; username: string; risk_level: string }>;
    recommendations: string[];
  }>('/user-security/compliance-report');
}
