/**
 * Audit API
 * API for audit log viewing and cleanup
 */
import { get, post } from '@/api/request';

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export function getAuditLogs(params?: Record<string, any>): Promise<any> {
  return get('/audit', params);
}

export function getAuditLog(id: number): Promise<AuditLog> {
  return get<AuditLog>(`/audit/${id}`);
}

export function cleanupLogs(days: number): Promise<any> {
  return post('/audit/cleanup', { days });
}
