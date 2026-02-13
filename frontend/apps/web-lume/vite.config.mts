import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve } from 'path';
import { copyFileSync, existsSync } from 'fs';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const isProduction = mode === 'production';

  return {
    plugins: [
      vue(),
      vueJsx(),
      // Copy .htaccess to dist
      {
        name: 'copy-htaccess',
        enforce: 'post',
        buildEnd: () => {
          const htaccessPath = resolve(__dirname, 'public/.htaccess');
          const distPath = resolve(__dirname, 'dist/.htaccess');
          if (existsSync(htaccessPath)) {
            copyFileSync(htaccessPath, distPath);
          }
        }
      },
      // Gzip compression for production
      isProduction && compression({
        algorithm: 'gzip',
        ext: '.gz',
        deleteOriginFile: false,
      }),
      // Brotli compression for production
      isProduction && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        deleteOriginFile: false,
      }),
      // Bundle analyzer for optimization insights
      isProduction ? visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
      }) : false,
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '#': resolve(__dirname, 'src')
      }
    },
    server: {
      port: parseInt(process.env.VITE_PORT || '5173'),
      host: '0.0.0.0',
      strictPort: false,
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_URL || 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },
    css: {
      postcss: './postcss.config.js',
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      // Optimize chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'vendor': ['vue', 'vue-router', 'pinia'],
            'antd': ['ant-design-vue', '@ant-design/icons-vue'],
            'charts': ['echarts', 'vue-echarts'],
            'utils': ['axios', 'dayjs', 'date-fns', 'lodash-es'],
          },
          // Optimize chunk file names
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          // Ensure consistent chunk order
          hoistTransitiveImports: false,
        },
      },
      // Minification settings
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: ['console.log', 'console.info'],
        },
        mangle: {
          safari10: true,
        },
      },
      // CSS optimization
      cssCodeSplit: true,
      // Chunk size warning limit
      chunkSizeWarningLimit: 500,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'axios', 'dayjs'],
      exclude: ['@ant-design/icons-vue'],
    },
    // Cache configuration
    cache: true,
    // Vitest configuration
    test: {
      exclude: ['**/node_modules/**', '**/tests/*.spec.ts', '**/e2e/**'],
      include: ['**/*.test.ts', '**/*.test.js'],
    },
  };
});
