/**
 * Auth Utilities for Nuxt/H3 Server
 * Port of Express auth middleware to H3 composables
 */

import prisma, { setAuditContext } from '../db/prisma'
import crypto from 'crypto'

// JWT utilities (from existing shared utils)
const jwtUtil = {
  verifyToken: (token: string) => {
    try {
      // Placeholder: implement JWT verification
      // In real implementation, use jsonwebtoken library
      return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    } catch {
      return null
    }
  },
}

// Lazy-load Drizzle adapters
let _apiKeyAdapter: any = null
let _sessionAdapter: any = null

async function getApiKeyAdapter() {
  if (!_apiKeyAdapter) {
    const { DrizzleAdapter } = await import('../../../backend/src/core/db/adapters/drizzle-adapter.js')
    const { apiKeys } = await import('../../../backend/src/modules/base_security/models/schema.js')
    _apiKeyAdapter = new DrizzleAdapter(apiKeys)
  }
  return _apiKeyAdapter
}

async function getSessionAdapter() {
  if (!_sessionAdapter) {
    const { DrizzleAdapter } = await import('../../../backend/src/core/db/adapters/drizzle-adapter.js')
    const { sessions } = await import('../../../backend/src/modules/base_security/models/schema.js')
    _sessionAdapter = new DrizzleAdapter(sessions)
  }
  return _sessionAdapter
}

/**
 * Authenticate user from Bearer token or API key
 * Sets event.context.user with user data
 */
export async function authenticateH3(event: any) {
  try {
    const authHeader = getHeader(event, 'authorization')
    const apiKeyHeader = getHeader(event, 'x-api-key')

    // ─── API Key Authentication ───
    if (apiKeyHeader) {
      try {
        const adapter = await getApiKeyAdapter()
        const hash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex')
        const apiKey = await adapter.findOne([
          ['key', '=', hash],
          ['status', '=', 'active'],
        ])

        if (!apiKey) {
          throw createError({
            statusCode: 401,
            statusMessage: 'Invalid API key',
          })
        }

        if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
          await adapter.update(apiKey.id, { status: 'expired' })
          throw createError({
            statusCode: 401,
            statusMessage: 'API key expired',
          })
        }

        // Update last used (fire-and-forget)
        adapter.update(apiKey.id, { lastUsedAt: new Date() }).catch(() => {})

        // Resolve user from API key
        const user = apiKey.userId ? await prisma.user.findUnique({ where: { id: apiKey.userId } }) : null
        if (!user || !user.isActive) {
          throw createError({
            statusCode: 401,
            statusMessage: 'API key user not found or inactive',
          })
        }

        const role = await prisma.role.findUnique({ where: { id: user.role_id } })
        event.context.user = {
          id: user.id,
          email: user.email,
          role: role?.name || 'viewer',
          role_id: user.role_id,
          authMethod: 'api_key',
          apiKeyScopes: typeof apiKey.scopes === 'string' ? JSON.parse(apiKey.scopes) : apiKey.scopes || [],
        }

        setAuditContext({
          userId: user.id,
          ipAddress: getClientIP(event),
          userAgent: getHeader(event, 'user-agent'),
        })

        return event.context.user
      } catch (err: any) {
        console.error('API key auth error:', err.message)
        throw createError({
          statusCode: 401,
          statusMessage: 'API key authentication failed',
        })
      }
    }

    // ─── Bearer Token Authentication ───
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwtUtil.verifyToken(token)

    if (!decoded) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token expired',
      })
    }

    if (decoded.pending2FA) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Two-factor authentication not completed',
      })
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } })

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User not found',
      })
    }

    if (!user.isActive) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Account deactivated',
      })
    }

    // Validate session is still active
    const isProduction = process.env.NODE_ENV === 'production'
    try {
      const sessAdapter = await getSessionAdapter()
      const session = await sessAdapter.findOne([
        ['token', '=', token],
        ['status', '=', 'active'],
      ])
      if (!session) {
        if (isProduction) {
          throw createError({
            statusCode: 401,
            statusMessage: 'Session not found or revoked. Please log in again.',
          })
        }
      } else {
        sessAdapter.update(session.id, { lastActivityAt: new Date() }).catch(() => {})
      }
    } catch (err: any) {
      if (isProduction) {
        console.error('Session validation error (production):', err.message)
        throw createError({
          statusCode: 503,
          statusMessage: 'Session service unavailable',
        })
      } else {
        console.warn('Session validation warning (development):', err.message)
      }
    }

    const role = await prisma.role.findUnique({ where: { id: user.role_id } })
    event.context.user = {
      id: user.id,
      email: user.email,
      role: role?.name || 'viewer',
      role_id: user.role_id,
      authMethod: 'bearer',
    }

    setAuditContext({
      userId: user.id,
      ipAddress: getClientIP(event),
      userAgent: getHeader(event, 'user-agent'),
    })

    return event.context.user
  } catch (error: any) {
    console.error('Authentication error:', error)
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication failed',
    })
  }
}

/**
 * Check if user has specific permission
 */
export async function authorizeH3(event: any, resource?: string, action?: string) {
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  if (!resource && !action) {
    return true
  }

  const userRole = user.role

  // Admin and super_admin bypass all permission checks
  if (userRole === 'admin' || userRole === 'super_admin') {
    return true
  }

  // For non-admin users, check role-based permissions
  const permissionName = resource && action ? `${resource}.${action}` : resource

  const roleRecord = await prisma.role.findFirst({
    where: { name: userRole, isActive: true },
  })

  if (!roleRecord) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Role not found',
    })
  }

  const hasPermission = await prisma.rolePermission.findFirst({
    where: {
      roleId: roleRecord.id,
      permission: { name: permissionName },
    },
  })

  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      statusMessage: `Access denied. Missing permission: ${permissionName}`,
    })
  }

  event.context.user.roleRecord = roleRecord
  return true
}

/**
 * Optional auth — set user if valid token, continue if not
 */
export async function optionalAuthH3(event: any) {
  try {
    const authHeader = getHeader(event, 'authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwtUtil.verifyToken(token)

    if (decoded) {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } })

      if (user && user.isActive) {
        const role = await prisma.role.findUnique({ where: { id: user.role_id } })
        event.context.user = {
          id: user.id,
          email: user.email,
          role: role?.name || 'viewer',
          role_id: user.role_id,
        }
        return event.context.user
      }
    }
  } catch (error) {
    console.warn('Optional auth error:', error)
  }

  return null
}

/**
 * Get client IP from H3 event
 */
function getClientIP(event: any): string {
  return (
    getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() ||
    getHeader(event, 'x-real-ip') ||
    event.node.req.socket.remoteAddress ||
    'unknown'
  )
}

export default {
  authenticateH3,
  authorizeH3,
  optionalAuthH3,
  setAuditContext,
}
