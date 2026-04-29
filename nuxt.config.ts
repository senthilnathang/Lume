import type { NuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // ─── App Config ───
  app: {
    head: {
      title: 'Lume v2.0',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  // ─── Rendering Mode ───
  ssr: false,

  // ─── Dev Server ───
  devServer: {
    host: '0.0.0.0',
    port: 3001,
  },

  // ─── Build Config ───
  build: {
    transpile: [],
  },

  // ─── Runtime Config ───
  runtimeConfig: {
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: process.env.DB_PORT || 3306,
    dbName: process.env.DB_NAME || 'lume',
    dbUser: process.env.DB_USER || 'gawdesy',
    dbPassword: process.env.DB_PASSWORD || 'gawdesy',
    dbType: process.env.DB_TYPE || 'mysql',
    dbPoolSize: parseInt(process.env.DB_POOL_SIZE || '10'),

    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret',

    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    nodeEnv: process.env.NODE_ENV || 'development',

    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      appName: 'Lume',
      appVersion: '2.0.0',
    },
  },

  // ─── Nitro Config ───
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: [],
    },
    esbuild: {
      options: {
        target: 'es2020',
      },
    },
    minify: true,
  },

  // ─── TypeScript ───
  typescript: {
    typeCheck: true,
    strict: true,
    shim: false,
  },

  // ─── Aliases ───
  alias: {
    '@': `${process.cwd()}/frontend/apps/web-lume/src`,
    '@modules': `${process.cwd()}/backend/src/modules`,
    '@server': `${process.cwd()}/server`,
    '@core': `${process.cwd()}/backend/src/core`,
  },

  vite: {
    ssr: {
      external: ['bullmq', 'bcryptjs', '@prisma/client', 'drizzle-orm', 'mysql2', 'pg'],
    },
  },
})
