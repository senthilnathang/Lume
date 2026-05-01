import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const widgetsDir = resolve(__dirname, '../../../backend/src/modules/editor/static/widgets')

export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: true,
  plugins: ['~/plugins/analytics.client.ts'],
  nitro: {
    routeRules: {
      '/robots.txt': { proxy: `${process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/website/public/robots.txt` },
      '/sitemap.xml': { proxy: `${process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/website/public/sitemap.xml` },
    },
  },
  css: [
    '~/assets/css/main.css',
    resolve(widgetsDir, 'widget-styles.css'),
    resolve(widgetsDir, 'motion-fx.css'),
    resolve(widgetsDir, 'animation-styles.css'),
  ],
  alias: {
    '@widgets': widgetsDir,
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api/website/public',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'My Website',
      siteTitle: process.env.NUXT_PUBLIC_SITE_TITLE || process.env.NUXT_PUBLIC_SITE_NAME || 'My Website',
      siteDescription: process.env.NUXT_PUBLIC_SITE_DESCRIPTION || 'Welcome to our website',
      themeColor: process.env.NUXT_PUBLIC_THEME_COLOR || '#3B82F6',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3100',
    },
  },
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: process.env.NUXT_PUBLIC_SITE_TITLE || process.env.NUXT_PUBLIC_SITE_NAME || 'My Website',
      meta: [
        { name: 'description', content: process.env.NUXT_PUBLIC_SITE_DESCRIPTION || 'Welcome to our website' },
        { property: 'og:site_name', content: process.env.NUXT_PUBLIC_SITE_NAME || 'My Website' },
        { name: 'theme-color', content: process.env.NUXT_PUBLIC_THEME_COLOR || '#3B82F6' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'stylesheet', href: `${process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/website/public/styles.css` },
      ],
    },
  },
})
