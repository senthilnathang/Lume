/**
 * Data Management Module Manifest
 * Data import & export management
 */

export default {
  name: 'Data Management',
  technicalName: 'base_features_data',
  version: '1.0.0',
  summary: 'Data Import & Export Management',
  description: '# Data Management Module\n\nProvides comprehensive data import and export functionality.\n\n- **Data Import** - CSV file import with column mapping, preview, validation, and execution\n- **Data Export** - Model data export to CSV/JSON with field selection and filters',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'Administration',

  application: true,
  installable: true,
  autoInstall: true,

  depends: ['base'],

  models: ['models/index.js'],
  services: ['services/index.js'],
  api: ['api/index.js'],

  frontend: {
    routes: [],
    views: [
      'views/data-import.vue',
      'views/data-export.vue',
    ],
    menus: [
      {
        name: 'Data Management',
        path: '/base-features-data/data',
        icon: 'lucide:database',
        sequence: 3,
        children: [
          {
            name: 'Data Import',
            path: '/base-features-data/data-import',
            icon: 'lucide:upload',
            sequence: 1,
          },
          {
            name: 'Data Export',
            path: '/base-features-data/data-export',
            icon: 'lucide:download',
            sequence: 2,
          },
        ],
      },
    ],
  },

  permissions: [
    { name: 'base_features_data.import.view', description: 'View data imports', group: 'Data Management' },
    { name: 'base_features_data.import.execute', description: 'Execute data imports', group: 'Data Management' },
    { name: 'base_features_data.export.view', description: 'View data exports', group: 'Data Management' },
    { name: 'base_features_data.export.execute', description: 'Execute data exports', group: 'Data Management' },
    { name: 'base_features_data.export.template_manage', description: 'Manage export templates', group: 'Data Management' },
  ],
};
