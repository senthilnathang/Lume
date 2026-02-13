import { AuditLog } from '../models/index';
import type { AuditAction } from '../models/audit-log.model';

export interface AuditParams {
  userId?: number | null;
  companyId?: number | null;
  action: AuditAction;
  entityType: string;
  entityId?: number;
  entityName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Create an audit log entry.
 */
export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    await AuditLog.create({
      user_id: params.userId,
      company_id: params.companyId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName,
      old_values: params.oldValues,
      new_values: params.newValues,
      changed_fields: params.changedFields,
      description: params.description,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      request_id: params.requestId,
    } as any);
  } catch (error) {
    console.error('[AuditLog] Failed to create audit entry:', error);
  }
}

/**
 * Helper to compute changed fields between old and new objects.
 */
export function computeChangedFields(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
): string[] {
  const changed: string[] = [];
  for (const key of Object.keys(newValues)) {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changed.push(key);
    }
  }
  return changed;
}

/**
 * Audit a CRUD operation (create/update/delete).
 */
export async function auditCrudOperation(params: {
  userId?: number | null;
  companyId?: number | null;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId?: number;
  entityName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  requestId?: string;
}): Promise<void> {
  const changedFields = params.oldValues && params.newValues
    ? computeChangedFields(params.oldValues, params.newValues)
    : undefined;

  await createAuditLog({
    ...params,
    changedFields,
  });
}
