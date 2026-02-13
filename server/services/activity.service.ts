import { ActivityLog } from '../models/index';
import type { ActivityCategory, ActivityLevel } from '../models/activity-log.model';

export interface LogActivityParams {
  userId?: number | null;
  companyId?: number | null;
  action: string;
  category?: ActivityCategory;
  level?: ActivityLevel;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  changes?: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  requestMethod?: string;
  requestPath?: string;
  httpStatus?: number;
  responseTimeMs?: number;
  sessionId?: string;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Log an activity event.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await ActivityLog.create({
      user_id: params.userId,
      company_id: params.companyId,
      action: params.action,
      category: params.category || 'data_management',
      level: params.level || 'info',
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName,
      changes: params.changes,
      old_values: params.oldValues,
      new_values: params.newValues,
      description: params.description,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      request_id: params.requestId,
      request_method: params.requestMethod,
      request_path: params.requestPath,
      http_status: params.httpStatus,
      response_time_ms: params.responseTimeMs,
      session_id: params.sessionId,
      success: params.success ?? true,
      error_message: params.errorMessage,
    } as any);
  } catch (error) {
    // Don't fail the request if activity logging fails
    console.error('[ActivityLog] Failed to log activity:', error);
  }
}

/**
 * Log a security-related activity with elevated risk scoring.
 */
export async function logSecurityActivity(
  params: LogActivityParams & { riskScore?: number; isSuspicious?: boolean },
): Promise<void> {
  await logActivity({
    ...params,
    category: 'security',
    level: params.level || 'warning',
  });
}
