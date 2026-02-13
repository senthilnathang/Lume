// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  future: {
    compatibilityVersion: 3,
  },

  // SPA mode (no SSR — matches current Lume frontend architecture)
  ssr: false,

  devtools: { enabled: true },

  // App directory
  dir: {
    app: 'app',
  },

  app: {
    head: {
      title: 'Lume Framework',
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  // Modules
  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
  ],

  // Tailwind CSS
  tailwindcss: {
    configPath: 'tailwind.config.ts',
    cssPath: '~/assets/css/globals.css',
  },

  // Color mode
  colorMode: {
    classSuffix: '',
    preference: 'light',
    fallback: 'light',
  },

  // Runtime config (accessible server-side via useRuntimeConfig())
  runtimeConfig: {
    // Server-only (not exposed to client)
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtAlgorithm: process.env.JWT_ALGORITHM || 'HS256',
    accessTokenExpireMinutes: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '11520'),
    refreshTokenExpireDays: parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || '30'),

    // Database
    dbType: process.env.DB_TYPE || 'mysql',
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: parseInt(process.env.DB_PORT || '3306'),
    dbName: process.env.DB_NAME || 'lume_db',
    dbUser: process.env.DB_USER || 'root',
    dbPassword: process.env.DB_PASSWORD || '',
    dbPoolSize: parseInt(process.env.DB_POOL_SIZE || '20'),
    dbLogging: process.env.DB_LOGGING === 'true',

    // Redis
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT || '6379'),
    redisPassword: process.env.REDIS_PASSWORD || '',
    redisDb: parseInt(process.env.REDIS_DB || '0'),

    // Security
    csrfEnabled: process.env.CSRF_ENABLED === 'true',
    rateLimitingEnabled: process.env.RATE_LIMITING_ENABLED !== 'false',
    zeroTrustEnabled: process.env.ZERO_TRUST_ENABLED !== 'false',

    // Modules
    modulesEnabled: process.env.MODULES_ENABLED !== 'false',
    modulesDir: process.env.MODULES_DIR || 'server/modules',

    // Public keys (exposed to client)
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'Lume Framework',
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || '1.0.0',
      apiBase: '/api/v1',
    },
  },

  // Nitro server configuration
  nitro: {
    // Plugins run on server startup
    plugins: [
      '~~/server/plugins/01.database.ts',
      '~~/server/plugins/02.modules.ts',
    ],

    // Enable experimental tasks for background jobs
    experimental: {
      tasks: true,
    },

    // Exclude old directories from Nitro scanning
    watchOptions: {
      ignored: [
        '**/backend/**',
        '**/frontend/**',
        '**/packages/**',
        '**/internal/**',
      ],
    },
  },

  // TypeScript
  typescript: {
    strict: true,
    typeCheck: false, // Enable in CI
  },

  // Auto-imports
  imports: {
    dirs: [
      'composables/**',
      'utils/**',
      'stores/**',
    ],
  },

  // Component auto-import
  components: [
    {
      path: '~/app/components',
      pathPrefix: false,
    },
  ],

  // Ignore old directories from watching
  watch: {
    ignore: [
      'backend/**',
      'frontend/**',
      'packages/**',
      'internal/**',
      'data/**',
      'docs/**',
    ],
  },

  // Vite config
  vite: {
    server: {
      watch: {
        ignored: [
          '**/backend/**',
          '**/frontend/**',
          '**/packages/**',
          '**/internal/**',
          '**/data/**',
        ],
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '',
        },
      },
    },
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-vue': ['vue', 'vue-router', 'pinia'],
            'vendor-utils': ['dayjs', 'lodash-es'],
          },
        },
      },
    },
  },
});
