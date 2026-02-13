/**
 * Base Features Data Module Manifest
 * Features and data management
 */

export default {
  name: 'Base Features Data',
  technicalName: 'base_features_data',
  version: '1.0.0',
  summary: 'Features and data management module',
  description: '# Base Features Data Module\n\nFeature flags and data management:\n\n- **Feature Flags** - Toggle features on/off\n- **Data Import/Export** - CSV, JSON import/export\n- **Data Backup** - Database backups\n- **Data Cleaning** - Data deduplication and cleanup\n- **Data Mapping** - Field mapping and transformations',
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
    views: [],
    menus: [
      {
        name: 'Features & Data',
        path: '/settings/features',
        icon: 'lucide:toggle-left',
        sequence: 5,
        permission: 'base_features_data.access',
        children: [
          {
            name: 'Feature Flags',
            path: '/settings/features/flags',
            icon: 'lucide:flag',
            sequence: 1,
            permission: 'base_features_data.flags.manage'
          },
          {
            name: 'Import Data',
            path: '/settings/features/import',
            icon: 'lucide:upload',
            sequence: 2,
            permission: 'base_features_data.import.manage'
          },
          {
            name: 'Export Data',
            path: '/settings/features/export',
            icon: 'lucide:download',
            sequence: 3,
            permission: 'base_features_data.export.manage'
          },
          {
            name: 'Backups',
            path: '/settings/features/backups',
            icon: 'lucide:database',
            sequence: 4,
            permission: 'base_features_data.backups.manage'
          }
        ]
      }
    ]
  },
  
  permissions: [
    { name: 'base_features_data.access', description: 'Access features & data', group: 'Features' },
    { name: 'base_features_data.flags', description: 'View feature flags', group: 'Features' },
    { name: 'base_features_data.flags.manage', description: 'Manage feature flags', group: 'Features' },
    { name: 'base_features_data.import', description: 'Import data', group: 'Features' },
    { name: 'base_features_data.import.manage', description: 'Manage data import', group: 'Features' },
    { name: 'base_features_data.export', description: 'Export data', group: 'Features' },
    { name: 'base_features_data.export.manage', description: 'Manage data export', group: 'Features' },
    { name: 'base_features_data.backups', description: 'View backups', group: 'Features' },
    { name: 'base_features_data.backups.manage', description: 'Manage backups', group: 'Features' }
  ]
};
