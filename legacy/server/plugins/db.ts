/**
 * Database Initialization Plugin
 * Initializes Prisma and Drizzle connections
 */

export default defineNitroPlugin(async (nitroApp) => {
  try {
    // Initialize Prisma (synchronous — already instantiated)
    const prisma = await import('../utils/db/prisma').then((m) => m.default)
    console.log('✓ Prisma client ready')

    // Initialize Drizzle (async)
    const drizzleModule = await import('../utils/db/drizzle')
    await drizzleModule.initDrizzle()
    console.log('✓ Drizzle client ready')

    // Health check on startup
    const user = await prisma.user.findFirst()
    console.log(`✓ Database connected (${user ? 'records exist' : 'empty database'})`)
  } catch (error: any) {
    console.error('✗ Database initialization failed:', error.message)
    throw error
  }
})
