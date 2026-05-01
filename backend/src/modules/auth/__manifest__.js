/**
 * Authentication Module Manifest
 */

export default {
  name: 'Authentication',
  technicalName: 'auth',
  version: '1.0.0',
  summary: 'Authentication and authorization',
  description: '# Authentication Module\n\nAuthentication system:\n\n- **JWT Tokens** - Secure token-based authentication\n- **Refresh Tokens** - Token renewal\n- **Role-Based Access** - Permission management\n- **Security** - Brute force protection',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'System',
  
  application: true,
  installable: true,
  autoInstall: false,
  
  depends: ['base'],
  
  models: ['models/index.js'],
  api: ['api/index.js'],
  services: ['services/index.js'],
  
  frontend: {
    routes: ['routes.ts'],
    views: ['views/login.vue', 'views/register.vue'],
    locales: ['locales/en.json'],
    menus: []
  },
  
  permissions: [
    'auth.login',
    'auth.logout',
    'auth.register',
    'auth.refresh_token'
  ]
}
