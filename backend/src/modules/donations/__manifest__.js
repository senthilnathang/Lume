/**
 * Donations Module Manifest
 */

export default {
  name: 'Donations',
  technicalName: 'donations',
  version: '1.0.0',
  summary: 'Donation and donor management',
  description: '# Donations Module\n\nComprehensive donation tracking:\n\n- **Donations** - Track all donations\n- **Donors** - Manage donor information\n- **Campaigns** - Create donation campaigns\n- **Reports** - Financial reports and analytics',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'Financial',
  
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
    components: ['components/DonationCard.vue'],
    locales: ['locales/en.json'],
    menus: [
      {
        name: 'Donations',
        path: '/donations',
        icon: 'lucide:heart',
        sequence: 20,
        children: [
          { name: 'All Donations', path: '/donations', icon: 'lucide:list', sequence: 1 },
          { name: 'Donors', path: '/donations/donors', icon: 'lucide:users', sequence: 2 },
          { name: 'Campaigns', path: '/donations/campaigns', icon: 'lucide:megaphone', sequence: 3 },
          { name: 'Reports', path: '/donations/reports', icon: 'lucide:bar-chart', sequence: 4 }
        ]
      }
    ]
  },
  
  permissions: [
    'donations.read',
    'donations.write',
    'donations.delete',
    'donations.create',
    'donations.export'
  ]
}
