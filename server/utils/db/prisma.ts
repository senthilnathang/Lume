import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// ─── Password Hashing Middleware ───
prisma.$use(async (params, next) => {
  if (params.model === 'User') {
    if (params.action === 'create' || params.action === 'update') {
      if (params.args.data?.password) {
        const salt = await bcrypt.genSalt(12)
        params.args.data.password = await bcrypt.hash(params.args.data.password, salt)
      }
    }
  }
  return next(params)
})

// ─── Audit Logging Middleware ───
const EXCLUDED_MODELS = ['AuditLog', 'Session', 'SecurityLog', 'WebhookLog']
const SENSITIVE_FIELDS = ['password', 'secret', 'token', 'key', 'backupCodes']

let _auditContext: any = {}

export function setAuditContext(ctx: any) {
  _auditContext = ctx
}

prisma.$use(async (params, next) => {
  const { model, action } = params

  if (!model || EXCLUDED_MODELS.includes(model)) return next(params)
  if (!['create', 'update', 'delete'].includes(action)) return next(params)

  let oldValues: any = null

  if ((action === 'update' || action === 'delete') && params.args?.where) {
    try {
      oldValues = await (prisma as any)[model].findUnique({ where: params.args.where })
    } catch {
      // Model may not support findUnique
    }
  }

  const result = await next(params)

  try {
    const newValues = action === 'delete' ? null : result
    const changes = action === 'update' && oldValues && newValues ? computeDiff(oldValues, newValues) : null

    const safeOld = oldValues ? redactSensitive(oldValues) : null
    const safeNew = newValues ? redactSensitive(newValues) : null

    const entityId = result?.id || oldValues?.id || params.args?.where?.id

    const oldValuesJson = safeOld ? JSON.stringify(changes ? { ...safeOld, _changes: changes } : safeOld) : null

    await prisma.auditLog
      .create({
        data: {
          action: action,
          model: model,
          recordId: entityId ? String(entityId) : null,
          oldValues: oldValuesJson,
          newValues: safeNew ? JSON.stringify(safeNew) : null,
          userId: _auditContext.userId || null,
          ipAddress: _auditContext.ipAddress || null,
          userAgent: _auditContext.userAgent || null,
        },
      })
      .catch(() => {})
  } catch {
    // Audit logging should never break the main operation
  }

  return result
})

function computeDiff(oldObj: any, newObj: any) {
  const diff: any = {}
  for (const key of Object.keys(newObj)) {
    if (SENSITIVE_FIELDS.includes(key)) continue
    if (key === 'updatedAt' || key === 'createdAt') continue
    const oldVal = oldObj[key]
    const newVal = newObj[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { from: oldVal, to: newVal }
    }
  }
  return Object.keys(diff).length > 0 ? diff : null
}

function redactSensitive(obj: any) {
  const safe = { ...obj }
  for (const field of SENSITIVE_FIELDS) {
    if (field in safe) {
      safe[field] = '[REDACTED]'
    }
  }
  return safe
}

export { prisma }
export default prisma
