/**
 * Audit Module Manifest
 */

export default {
  name: 'Audit',
  technicalName: 'audit',
  version: '1.0.0',
  summary: 'Audit logging and activity tracking',
  description: '# Audit Module\n\nSystem activity tracking:\n\n- **Activity Logs** - Track all user actions\n- **Filtering** - Filter by user, action, date\n- **Cleanup** - Archive old logs\n- **Compliance** - Meet regulatory requirements',
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
    views: ['views/list.vue'],
    locales: ['locales/en.json'],
    menus: [
      {
        name: 'Audit Logs',
        path: '/audit',
        icon: 'lucide:activity',
        sequence: 101,
        children: [
          { name: 'All Logs', path: '/audit', icon: 'lucide:list', sequence: 1 },
          { name: 'Cleanup', path: '/audit/cleanup', icon: 'lucide:trash-2', sequence: 2 }
        ]
      }
    ]
  },
  
  permissions: [
    'audit.read',
    'audit.delete'
  ]
}
