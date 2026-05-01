/**
 * User Module Manifest
 */

export default {
  name: 'User Management',
  technicalName: 'user',
  version: '1.0.0',
  summary: 'User account management',
  description: '# User Management Module\n\nUser account administration:\n\n- **User Accounts** - Create and manage users\n- **Authentication** - Login, logout, password management\n- **Profiles** - User profile information\n- **Account Status** - Active, inactive, locked accounts',
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
    views: ['views/list.vue', 'views/profile.vue'],
    locales: ['locales/en.json'],
    menus: []
  },
  
  permissions: [
    'user_management.read',
    'user_management.write',
    'user_management.delete',
    'user_management.create'
  ]
}
