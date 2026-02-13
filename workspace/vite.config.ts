# FastVue Development Workflow Configuration
# Modern development environment with hot reloading and comprehensive testing

# Root package.json build scripts
{
  "name": "gawdesy-workspace",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "npm run dev",
    "dev:admin": "npm run dev:admin", 
    "dev:website": "npm run dev:website",
    "dev:api": "npm run dev:api",
    "build": "npm run build",
    "test": "npm run test",
    "test:e2e": "playwright test",
    "lint": "npm run lint",
    "format": "npm run format",
    "type-check": "npm run type-check",
    "build:clean": "rimraf dist && rimraf .nitro-cache",
    "deploy": "npm run build && npm run start",
    "db:migrate": "npm run db:migrate",
    "db:seed": "npm run db:seed",
    "db:studio": "npm run db:studio"
  }
}

# Build Configuration (/workspace/turbo.json)
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  root: resolve(__dirname),
  appType: mode === 'production' ? 'app' : 'spa',
  
  build: {
    rollupOptions: {
      output: {
        dir: 'dist'
      },
      sourcemap: mode === 'development',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          dir: 'dist'
        },
        sourcemap: true
      }
    },
    
    server: mode === 'development' ? {
      hmr: true,
      port: 3001
    } : false,
    
    client: mode === 'development' ? {
      overlay: true
    } : false,
  }
};

# Dev Server Proxy Configuration (/workspace/vite.config.ts)
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  root: resolve(__dirname),
  plugins: [
    vue(),
    // Add other plugins as needed
  ],
  
  server: mode === 'development' ? {
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:3002'
      }
    }
  } : {},
});