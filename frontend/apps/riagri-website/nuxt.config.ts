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
      siteName: 'RIAGRI',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3100',
    },
  },
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'RIAGRI - Agricultural Equipment & Transport Solutions',
      meta: [
        { name: 'description', content: 'RIAGRI provides premium agricultural equipment, transport devices, and expert service solutions for modern farming.' },
        { property: 'og:site_name', content: 'RIAGRI' },
        { name: 'theme-color', content: '#16a34a' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'stylesheet', href: `${process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/website/public/styles.css` },
      ],
    },
  },
})
