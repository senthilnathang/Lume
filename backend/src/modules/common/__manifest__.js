/**
 * Common Module Manifest
 * Shared utilities for all Gawdesy modules
 */

export default {
  name: 'Common Utilities',
  technicalName: 'common',
  version: '1.0.0',
  summary: 'Shared composables, components, and locales for all modules',
  description: 'Provides common JavaScript utilities that are loaded at runtime by frontend views.',
  author: 'Gawdesy',
  website: 'https://gawdesy.org',
  license: 'MIT',
  category: 'System',
  
  application: false,
  installable: true,
  autoInstall: true,
  
  depends: [],
  
  models: [],
  api: [],
  services: [],
  
  frontend: {
    routes: [],
    views: [],
    locales: [],
    menus: []
  },
  
  permissions: []
}
