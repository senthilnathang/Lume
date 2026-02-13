/**
 * Media Library Module Manifest
 */

export default {
  name: 'Media Library',
  technicalName: 'media',
  version: '1.0.0',
  summary: 'Media file management',
  description: '# Media Library Module\n\nAdvanced media management:\n\n- **Media Library** - Organize all media files\n- **Featured Media** - Highlight important media\n- **Categories** - Organize by type\n- **Statistics** - Track views and downloads',
  author: 'Gawdesy',
  website: 'https://gawdesy.org',
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
    views: ['views/library.vue', 'views/upload.vue'],
    locales: ['locales/en.json'],
    menus: [
      {
        name: 'Media',
        path: '/media',
        icon: 'lucide:image',
        sequence: 35,
        children: [
          { name: 'Library', path: '/media', icon: 'lucide:library', sequence: 1 },
          { name: 'Upload', path: '/media/upload', icon: 'lucide:upload', sequence: 2 },
          { name: 'Featured', path: '/media/featured', icon: 'lucide:star', sequence: 3 }
        ]
      }
    ]
  },
  
  permissions: [
    'media.read',
    'media.write',
    'media.delete',
    'media.create',
    'media.featured'
  ]
}
