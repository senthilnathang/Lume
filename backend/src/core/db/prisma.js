import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Password hashing middleware
prisma.$use(async (params, next) => {
  if (params.model === 'User') {
    if (params.action === 'create' || params.action === 'update') {
      if (params.args.data?.password) {
        const salt = await bcrypt.genSalt(12);
        params.args.data.password = await bcrypt.hash(params.args.data.password, salt);
      }
    }
  }
  return next(params);
});

// Audit logging middleware — captures create/update/delete with old/new value diffs
const EXCLUDED_MODELS = ['AuditLog', 'Session', 'SecurityLog', 'WebhookLog'];
const SENSITIVE_FIELDS = ['password', 'secret', 'token', 'key', 'backupCodes'];

// Request context storage (set by requestLogger middleware)
let _auditContext = {};

export function setAuditContext(ctx) {
  _auditContext = ctx;
}

prisma.$use(async (params, next) => {
  const { model, action } = params;

  // Skip non-auditable models and non-mutation actions
  if (!model || EXCLUDED_MODELS.includes(model)) return next(params);
  if (!['create', 'update', 'delete'].includes(action)) return next(params);

  let oldValues = null;

  // Capture old values before update/delete
  if ((action === 'update' || action === 'delete') && params.args?.where) {
    try {
      oldValues = await prisma[model].findUnique({ where: params.args.where });
    } catch {
      // Model may not support findUnique — skip
    }
  }

  const result = await next(params);

  // Log the audit entry asynchronously (don't block the operation)
  try {
    const newValues = action === 'delete' ? null : result;
    const changes = action === 'update' && oldValues && newValues
      ? computeDiff(oldValues, newValues)
      : null;

    // Redact sensitive fields
    const safeOld = oldValues ? redactSensitive(oldValues) : null;
    const safeNew = newValues ? redactSensitive(newValues) : null;

    const entityId = result?.id || oldValues?.id || params.args?.where?.id;

    // Build oldValues JSON including changes diff
    const oldValuesJson = safeOld
      ? JSON.stringify(changes ? { ...safeOld, _changes: changes } : safeOld)
      : null;

    await prisma.auditLog.create({
      data: {
        action: action,
        model: model,
        recordId: entityId ? String(entityId) : null,
        oldValues: oldValuesJson,
        newValues: safeNew ? JSON.stringify(safeNew) : null,
        userId: _auditContext.userId || null,
        ipAddress: _auditContext.ipAddress || null,
        userAgent: _auditContext.userAgent || null,
      }
    }).catch(() => {}); // Silently fail if audit table doesn't exist yet
  } catch {
    // Audit logging should never break the main operation
  }

  return result;
});

function computeDiff(oldObj, newObj) {
  const diff = {};
  for (const key of Object.keys(newObj)) {
    if (SENSITIVE_FIELDS.includes(key)) continue;
    if (key === 'updatedAt' || key === 'createdAt') continue;
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { from: oldVal, to: newVal };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
}

function redactSensitive(obj) {
  const safe = { ...obj };
  for (const field of SENSITIVE_FIELDS) {
    if (field in safe) {
      safe[field] = '[REDACTED]';
    }
  }
  return safe;
}

export { prisma };
export default prisma;
