import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const widgetsDir = resolve(__dirname, '../../packages/@lume/module-ui/src/modules/editor/static/widgets')

export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: true,
  typescript: { tsConfig: { compilerOptions: { paths: {
    'vue': [resolve(__dirname, 'node_modules/vue')],
    'lucide-vue-next': [resolve(__dirname, 'node_modules/lucide-vue-next')],
  } } } },
  plugins: ['~/plugins/analytics.client.ts'],
  nitro: {
    // Avoid circular Vue/server-renderer links in the Nitro 2 dependency tracer.
    experimental: { legacyExternals: true },
  },
  css: [
    '~/assets/css/main.css',
    resolve(widgetsDir, 'widget-styles.css'),
    resolve(widgetsDir, 'motion-fx.css'),
    resolve(widgetsDir, 'animation-styles.css'),
  ],
  alias: {
    '@widgets': widgetsDir,
    'lottie-web': resolve(__dirname, 'node_modules/lottie-web'),
  },
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v2/website/public',
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
      htmlAttrs: { lang: process.env.NUXT_PUBLIC_SITE_LANG || 'en' },
      title: process.env.NUXT_PUBLIC_SITE_TITLE || process.env.NUXT_PUBLIC_SITE_NAME || 'My Website',
      meta: [
        { name: 'description', content: process.env.NUXT_PUBLIC_SITE_DESCRIPTION || 'Welcome to our website' },
        { property: 'og:site_name', content: process.env.NUXT_PUBLIC_SITE_NAME || 'My Website' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: `${(process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3100').replace(/\/+$/, '')}/og-image.png` },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'theme-color', content: process.env.NUXT_PUBLIC_THEME_COLOR || '#3B82F6' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
})
