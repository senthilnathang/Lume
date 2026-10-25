import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
      ],
    },
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
  resolve: {
    alias: {
      'vue': fileURLToPath(new URL('./node_modules/vue', import.meta.url)),
      'vue-router': fileURLToPath(new URL('./node_modules/vue-router', import.meta.url)),
      'ant-design-vue': fileURLToPath(new URL('./node_modules/ant-design-vue', import.meta.url)),
      'dayjs': fileURLToPath(new URL('./node_modules/dayjs', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@modules': fileURLToPath(new URL('../../packages/@lume/module-ui/src/modules', import.meta.url)),
    },
  },
})
