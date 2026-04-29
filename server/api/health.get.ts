/**
 * Health Check Endpoint
 * GET /api/health
 */

export default defineEventHandler(async (event) => {
  return {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: '2.0.0',
    },
  }
})
