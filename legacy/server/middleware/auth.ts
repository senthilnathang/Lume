/**
 * H3 Auth Middleware
 * Validates JWT/API key on protected routes
 */

import { authenticateH3, optionalAuthH3 } from '../utils/auth/index'

export default defineEventHandler(async (event) => {
  // ─── Skip for public API routes ───
  const publicRoutes = [
    '/api/public/',
    '/api/health',
    '/api/users/login',
    '/api/users/register',
  ]

  const path = getRouterParam(event, '_path') || event.node.req.url || ''
  const isPublic = publicRoutes.some((route) => path.startsWith(route))

  if (isPublic) {
    return
  }

  // ─── Require auth for protected routes ───
  try {
    await authenticateH3(event)
  } catch (error: any) {
    throw error // Rethrow to H3 error handler
  }
})
