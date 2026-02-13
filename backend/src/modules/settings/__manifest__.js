/**
 * Settings Module Manifest
 */

export default {
  name: 'Settings',
  technicalName: 'settings',
  version: '1.0.0',
  summary: 'Application settings management',
  description: '# Settings Module\n\nApplication configuration:\n\n- **General Settings** - Site name, description\n- **Contact Info** - Email, phone, address\n- **Localization** - Currency, timezone\n- **Social Links** - Social media connections',
  author: 'Gawdesy',
  website: 'https://gawdesy.org',
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
    views: ['views/settings.vue'],
    locales: ['locales/en.json'],
    menus: [
      {
        name: 'Settings',
        path: '/settings',
        icon: 'lucide:settings',
        sequence: 100,
        children: [
          { name: 'General', path: '/settings/general', icon: 'lucide:sliders', sequence: 1 },
          { name: 'Contact', path: '/settings/contact', icon: 'lucide:mail', sequence: 2 },
          { name: 'Localization', path: '/settings/localization', icon: 'lucide:globe', sequence: 3 },
          { name: 'Social', path: '/settings/social', icon: 'lucide:share-2', sequence: 4 }
        ]
      }
    ]
  },
  
  permissions: [
    'settings.read',
    'settings.write',
    'settings.delete'
  ]
}
