/**
 * Team Module Manifest
 */

export default {
  name: 'Team',
  technicalName: 'team',
  version: '1.0.0',
  summary: 'Team members management',
  description: '# Team Module\n\nTeam member directory:\n\n- **Team Members** - Manage team profiles\n- **Departments** - Organize by department\n- **Leadership** - Mark team leaders\n- **Ordering** - Custom display order',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'Human Resources',
  
  application: true,
  installable: true,
  autoInstall: false,
  
  depends: ['base'],
  
  models: ['models/index.js'],
  api: ['api/index.js'],
  services: ['services/index.js'],
  
  frontend: {
    routes: ['routes.ts'],
    views: ['views/list.vue', 'views/detail.vue'],
    locales: ['locales/en.json'],
    menus: [
      {
        name: 'Team',
        path: '/team',
        icon: 'lucide:users',
        sequence: 15,
        children: [
          { name: 'All Team', path: '/team', icon: 'lucide:users', sequence: 1, viewName: 'list' },
          { name: 'Leadership', path: '/team/leadership', icon: 'lucide:crown', sequence: 2, viewName: 'leadership' },
          { name: 'Departments', path: '/team/departments', icon: 'lucide:building', sequence: 3, viewName: 'departments' }
        ]
      }
    ]
  },
  
  permissions: [
    'team.read',
    'team.write',
    'team.delete',
    'team.create'
  ]
}
