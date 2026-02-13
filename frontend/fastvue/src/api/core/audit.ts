import { requestClient } from '#/api/request';

/**
 * Audit API Namespace
 */
export namespace AuditApi {
  /** Audit log actions */
  export type AuditAction =
    | 'CREATE'
    | 'READ'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'EXPORT'
    | 'IMPORT'
    | 'PASSWORD_CHANGE'
    | 'PERMISSION_CHANGE'
    | 'ROLE_ASSIGN'
    | 'ROLE_REVOKE'
    | 'COMPANY_SWITCH';

  /** Audit log entry */
  export interface AuditLogEntry {
    id: number;
    user_id: number | null;
    user_email: string | null;
    user_name: string | null;
    company_id: number | null;
    company_name: string | null;
    action: AuditAction;
    entity_type: string;
    entity_id: string | null;
    entity_name: string | null;
    old_values: Record<string, any> | null;
    new_values: Record<string, any> | null;
    changes: Record<string, { old: any; new: any }> | null;
    ip_address: string | null;
    user_agent: string | null;
    request_method: string | null;
    request_path: string | null;
    success: boolean;
    error_message: string | null;
    metadata: Record<string, any> | null;
    created_at: string;
  }

  /** Audit log list params */
  export interface AuditLogListParams {
    page?: number;
    page_size?: number;
    user_id?: number;
    company_id?: number;
    action?: AuditAction;
    entity_type?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    ip_address?: string;
    success?: boolean;
  }

  /** Audit log list response */
  export interface AuditLogListResponse {
    total: number;
    items: AuditLogEntry[];
    page: number;
    page_size: number;
  }

  /** Audit statistics */
  export interface AuditStats {
    total_count: number;
    by_action: Array<{ action: string; count: number }>;
    by_entity_type: Array<{ entity_type: string; count: number }>;
    by_user: Array<{ user_id: number; user_name: string; count: number }>;
    daily_activity: Array<{ date: string; count: number }>;
    success_count: number;
    failure_count: number;
    days: number;
  }

  /** Entity types for filtering */
  export interface EntityType {
    name: string;
    count: number;
  }
}

/** Audit action labels for display */
export const AuditActionLabels: Record<AuditApi.AuditAction, string> = {
  CREATE: 'Create',
  READ: 'View',
  UPDATE: 'Update',
  DELETE: 'Delete',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  EXPORT: 'Export',
  IMPORT: 'Import',
  PASSWORD_CHANGE: 'Password Change',
  PERMISSION_CHANGE: 'Permission Change',
  ROLE_ASSIGN: 'Role Assigned',
  ROLE_REVOKE: 'Role Revoked',
  COMPANY_SWITCH: 'Company Switch',
};

/**
 * Get audit log entries with pagination and filtering
 */
export async function getAuditLogsApi(params?: AuditApi.AuditLogListParams) {
  return requestClient.get<AuditApi.AuditLogListResponse>('/audit/', { params });
}

/**
 * Get detailed audit log entry
 */
export async function getAuditLogDetailApi(id: number) {
  return requestClient.get<AuditApi.AuditLogEntry>(`/audit/${id}`);
}

/**
 * Get audit log statistics
 */
export async function getAuditStatsApi(params?: {
  days?: number;
  company_id?: number;
}) {
  return requestClient.get<AuditApi.AuditStats>('/audit/stats', { params });
}

/**
 * Get entity types for filtering
 */
export async function getAuditEntityTypesApi() {
  return requestClient.get<AuditApi.EntityType[]>('/audit/entity-types');
}

/**
 * Get user activity log
 */
export async function getUserActivityApi(
  userId: number,
  params?: { page?: number; page_size?: number },
) {
  return requestClient.get<AuditApi.AuditLogListResponse>(
    `/users/${userId}/activity`,
    { params },
  );
}

/**
 * Get company activity log
 */
export async function getCompanyActivityApi(
  companyId: number,
  params?: { page?: number; page_size?: number },
) {
  return requestClient.get<AuditApi.AuditLogListResponse>(
    `/companies/${companyId}/activity`,
    { params },
  );
}

/**
 * Get my activity log (current user)
 */
export async function getMyActivityApi(params?: {
  page?: number;
  page_size?: number;
}) {
  return requestClient.get<AuditApi.AuditLogListResponse>('/auth/me/activity', {
    params,
  });
}

/**
 * Get content types for audit filtering
 */
export async function getAuditContentTypesApi() {
  return requestClient.get<Array<{ id: number; name: string; model: string }>>(
    '/audit/content-types',
  );
}
