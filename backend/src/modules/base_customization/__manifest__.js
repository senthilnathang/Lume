/**
 * Base Customization Module Manifest
 * UI and record customization features
 */

export default {
  name: 'Base Customization',
  technicalName: 'base_customization',
  version: '1.0.0',
  summary: 'UI customization, custom fields, and form configuration',
  description: '# Base Customization Module\n\nCustomization features:\n\n- **Custom Fields** - Add custom fields to any model\n- **Custom Views** - Custom list/form view configurations\n- **Form Layouts** - Drag-and-drop form designer\n- **List Configurations** - Column visibility, ordering, default filters\n- **Dashboard Widgets** - Custom dashboard widget definitions',
  author: 'Gawdesy',
  website: 'https://gawdesy.org',
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
      'views/custom-fields.vue',
      'views/custom-views.vue',
      'views/form-builder.vue',
      'views/list-configs.vue',
      'views/dashboard-widgets.vue',
    ],
    menus: [
      {
        name: 'Customization',
        path: '/settings/customization',
        icon: 'lucide:palette',
        sequence: 7,
        permission: 'base_customization.access',
        children: [
          {
            name: 'Custom Fields',
            path: '/settings/customization/fields',
            icon: 'lucide:columns',
            sequence: 1,
            permission: 'base_customization.fields.manage'
          },
          {
            name: 'Custom Views',
            path: '/settings/customization/views',
            icon: 'lucide:layout-dashboard',
            sequence: 2,
            permission: 'base_customization.views.manage'
          },
          {
            name: 'Form Layouts',
            path: '/settings/customization/forms',
            icon: 'lucide:layout',
            sequence: 3,
            permission: 'base_customization.forms.manage'
          },
          {
            name: 'List Config',
            path: '/settings/customization/lists',
            icon: 'lucide:list',
            sequence: 4,
            permission: 'base_customization.lists.manage'
          },
          {
            name: 'Dashboard Widgets',
            path: '/settings/customization/widgets',
            icon: 'lucide:layout-grid',
            sequence: 5,
            permission: 'base_customization.widgets.manage'
          }
        ]
      }
    ]
  },

  permissions: [
    { name: 'base_customization.access', description: 'Access customization settings', group: 'Customization' },
    { name: 'base_customization.fields', description: 'View custom fields', group: 'Customization' },
    { name: 'base_customization.fields.manage', description: 'Manage custom fields', group: 'Customization' },
    { name: 'base_customization.views', description: 'View custom views', group: 'Customization' },
    { name: 'base_customization.views.manage', description: 'Manage custom views', group: 'Customization' },
    { name: 'base_customization.forms', description: 'View form layouts', group: 'Customization' },
    { name: 'base_customization.forms.manage', description: 'Manage form layouts', group: 'Customization' },
    { name: 'base_customization.lists', description: 'View list configurations', group: 'Customization' },
    { name: 'base_customization.lists.manage', description: 'Manage list configurations', group: 'Customization' },
    { name: 'base_customization.widgets', description: 'View dashboard widgets', group: 'Customization' },
    { name: 'base_customization.widgets.manage', description: 'Manage dashboard widgets', group: 'Customization' }
  ]
};
