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
      // TipTap editor packages (used by editor module)
      '@tiptap/vue-3': nm('@tiptap/vue-3'),
      '@tiptap/pm': nm('@tiptap/pm'),
      '@tiptap/core': nm('@tiptap/core'),
      '@tiptap/starter-kit': nm('@tiptap/starter-kit'),
      '@tiptap/extension-image': nm('@tiptap/extension-image'),
      '@tiptap/extension-link': nm('@tiptap/extension-link'),
      '@tiptap/extension-placeholder': nm('@tiptap/extension-placeholder'),
      '@tiptap/extension-text-align': nm('@tiptap/extension-text-align'),
      '@tiptap/extension-underline': nm('@tiptap/extension-underline'),
      '@tiptap/extension-color': nm('@tiptap/extension-color'),
      '@tiptap/extension-text-style': nm('@tiptap/extension-text-style'),
      '@tiptap/extension-highlight': nm('@tiptap/extension-highlight'),
      '@tiptap/extension-table': nm('@tiptap/extension-table'),
      '@tiptap/extension-table-row': nm('@tiptap/extension-table-row'),
      '@tiptap/extension-table-cell': nm('@tiptap/extension-table-cell'),
      '@tiptap/extension-table-header': nm('@tiptap/extension-table-header'),
      '@tiptap/extension-dropcursor': nm('@tiptap/extension-dropcursor'),
      '@tiptap/extension-gapcursor': nm('@tiptap/extension-gapcursor'),
      '@tiptap/suggestion': nm('@tiptap/suggestion'),
      // Drag-and-drop (used by website menu editor)
      'vuedraggable': path.resolve(frontendRoot, 'node_modules/vuedraggable/dist/vuedraggable.umd.js'),
      'sortablejs': nm('sortablejs'),
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
