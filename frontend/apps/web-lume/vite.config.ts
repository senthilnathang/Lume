import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import path from 'path';
import compression from 'vite-plugin-compression';

const frontendRoot = __dirname;
const nm = (pkg: string) => path.resolve(frontendRoot, 'node_modules', pkg);

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    compression(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(frontendRoot, 'src'),
      '@modules': path.resolve(frontendRoot, '../../../backend/src/modules'),
      // Explicit aliases so backend module views (via @modules) resolve
      // third-party packages from the frontend's node_modules
      '@ant-design/icons-vue': nm('@ant-design/icons-vue'),
      'ant-design-vue': nm('ant-design-vue'),
      'echarts/core': nm('echarts/core'),
      'echarts/renderers': nm('echarts/renderers'),
      'echarts/charts': nm('echarts/charts'),
      'echarts/components': nm('echarts/components'),
      'vue-echarts': nm('vue-echarts'),
      'lucide-vue-next': nm('lucide-vue-next'),
      'dayjs': nm('dayjs'),
    },
    dedupe: ['vue', 'vue-router', 'pinia'],
  },
  server: {
    port: 3001,
    host: true,
    fs: {
      allow: [
        path.resolve(frontendRoot, '..'),
        path.resolve(frontendRoot, '../../../backend/src/modules'),
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]',
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          antdv: ['ant-design-vue', '@ant-design/icons-vue'],
          utils: ['axios', 'dayjs', 'date-fns'],
        },
      },
    },
  },
});
