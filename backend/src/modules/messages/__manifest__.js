/**
 * Messages Module Manifest
 */

export default {
  name: 'Messages',
  technicalName: 'messages',
  version: '1.0.0',
  summary: 'Contact messages management',
  description: '# Messages Module\n\nContact form and message management:\n\n- **Inquiries** - Handle contact form submissions\n- **Status Tracking** - Track message status\n- **Priorities** - Mark urgent messages\n- **Replies** - Send responses',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'Communication',
  
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
        name: 'Messages',
        path: '/messages',
        icon: 'lucide:message-square',
        sequence: 25,
        children: [
          { name: 'Inbox', path: '/messages', icon: 'lucide:inbox', sequence: 1 },
          { name: 'Sent', path: '/messages/sent', icon: 'lucide:send', sequence: 2 }
        ]
      }
    ]
  },
  
  permissions: [
    'messages.read',
    'messages.write',
    'messages.delete',
    'messages.create'
  ]
}
