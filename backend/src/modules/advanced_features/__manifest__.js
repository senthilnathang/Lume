/**
 * Advanced Features Module Manifest
 * Webhooks, notifications, tags, and comments
 */

export default {
  name: 'Advanced Features',
  technicalName: 'advanced_features',
  version: '1.0.0',
  summary: 'Webhooks, notifications, tagging, and commenting system',
  description: '# Advanced Features Module\n\nAdvanced platform capabilities:\n\n- **Webhooks** - Outgoing webhook management for event-driven integrations\n- **Notifications** - In-app notification system with channels and preferences\n- **Tags** - Universal tagging system for any model\n- **Comments** - Threaded commenting system for records\n- **Attachments** - File attachment management for records',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'System',

  application: false,
  installable: true,
  autoInstall: true,

  depends: ['base'],

  models: ['models/index.js'],
  services: ['services/index.js'],
  api: ['api/index.js'],

  frontend: {
    routes: [],
    views: [
      'views/webhooks.vue',
      'views/notifications.vue',
      'views/notification-channels.vue',
      'views/tags.vue',
    ],
    menus: [
      {
        name: 'Advanced',
        path: '/settings/advanced',
        icon: 'lucide:puzzle',
        sequence: 8,
        permission: 'advanced_features.access',
        children: [
          {
            name: 'Webhooks',
            path: '/settings/advanced/webhooks',
            icon: 'lucide:webhook',
            sequence: 1,
            permission: 'advanced_features.webhooks.manage',
            viewName: 'webhooks'
          },
          {
            name: 'Notifications',
            path: '/settings/advanced/notifications',
            icon: 'lucide:bell',
            sequence: 2,
            permission: 'advanced_features.notifications.manage',
            viewName: 'notifications'
          },
          {
            name: 'Tags',
            path: '/settings/advanced/tags',
            icon: 'lucide:tag',
            sequence: 3,
            permission: 'advanced_features.tags.manage',
            viewName: 'tags'
          }
        ]
      }
    ]
  },

  permissions: [
    { name: 'advanced_features.access', description: 'Access advanced features', group: 'Advanced' },
    { name: 'advanced_features.webhooks', description: 'View webhooks', group: 'Advanced' },
    { name: 'advanced_features.webhooks.manage', description: 'Manage webhooks', group: 'Advanced' },
    { name: 'advanced_features.notifications', description: 'View notifications', group: 'Advanced' },
    { name: 'advanced_features.notifications.manage', description: 'Manage notification settings', group: 'Advanced' },
    { name: 'advanced_features.tags', description: 'View tags', group: 'Advanced' },
    { name: 'advanced_features.tags.manage', description: 'Manage tags', group: 'Advanced' },
    { name: 'advanced_features.comments', description: 'View comments', group: 'Advanced' },
    { name: 'advanced_features.comments.manage', description: 'Manage comments', group: 'Advanced' },
    { name: 'advanced_features.attachments', description: 'View attachments', group: 'Advanced' },
    { name: 'advanced_features.attachments.manage', description: 'Manage attachments', group: 'Advanced' }
  ]
};
