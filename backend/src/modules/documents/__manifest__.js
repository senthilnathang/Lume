/**
 * Documents Module Manifest
 */

export default {
  name: 'Documents',
  technicalName: 'documents',
  version: '1.0.0',
  summary: 'Document management',
  description: '# Documents Module\n\nFile and document management:\n\n- **Document Storage** - Upload and manage files\n- **Categories** - Organize by type\n- **Downloads** - Track download statistics\n- **Access Control** - Public and private documents',
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
    views: ['views/list.vue'],
    locales: ['locales/en.json'],
    menus: [
      {
        name: 'Documents',
        path: '/documents',
        icon: 'lucide:folder',
        sequence: 30,
        children: [
          { name: 'All Documents', path: '/documents', icon: 'lucide:files', sequence: 1 },
          { name: 'Images', path: '/documents/images', icon: 'lucide:image', sequence: 2 },
          { name: 'Videos', path: '/documents/videos', icon: 'lucide:video', sequence: 3 }
        ]
      }
    ]
  },
  
  permissions: [
    'documents.read',
    'documents.write',
    'documents.delete',
    'documents.create'
  ]
}
