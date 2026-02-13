import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api/v1': {
            changeOrigin: true,
            rewrite: (path) => path,
            // FastAPI backend target
            target: 'http://localhost:8000',
            ws: true,
            // Cookie forwarding for CSRF in development
            cookieDomainRewrite: 'localhost',
            cookiePathRewrite: '/',
          },
          '/modules': {
            changeOrigin: true,
            rewrite: (path) => path,
            // Module static files from backend
            target: 'http://localhost:8000',
          },
        },
      },
    },
  };
});
