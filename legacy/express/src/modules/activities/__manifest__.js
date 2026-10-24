/**
 * Activities Module Manifest
 */

export default {
  name: 'Activities',
  technicalName: 'activities',
  version: '1.0.0',
  summary: 'Activity and event management',
  description: '# Activities Module\n\nManage activities and events:\n\n- **Activity Management** - Create, edit, and publish activities\n- **Categories** - Organize activities by category\n- **Featured Activities** - Highlight important events\n- **Registration** - Track participant registration',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'Content',
  
  application: true,
  installable: true,
  autoInstall: false,
  
  depends: ['base'],
  
  models: ['models/index.js'],
  api: ['api/index.js'],
  services: ['services/index.js'],
  
  frontend: {
    routes: ['routes.ts'],
    views: ['views/list.vue', 'views/detail.vue', 'views/dashboard.vue'],
    components: ['components/ActivityCard.vue'],
    locales: ['locales/en.json'],
    menus: [
      {
        name: 'Activities',
        path: '/activities',
        icon: 'lucide:calendar',
        sequence: 10,
        children: [
          { name: 'All Activities', path: '/activities', icon: 'lucide:list', sequence: 1, viewName: 'list' },
          { name: 'Upcoming', path: '/activities/upcoming', icon: 'lucide:clock', sequence: 2, viewName: 'upcoming' },
          { name: 'Calendar', path: '/activities/calendar', icon: 'lucide:calendar-days', sequence: 3, viewName: 'calendar' }
        ]
      }
    ]
  },
  
  permissions: [
    'activities.read',
    'activities.write',
    'activities.delete',
    'activities.create',
    'activities.publish'
  ]
}
