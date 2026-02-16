/**
 * Website Module Manifest
 * CMS for public-facing website pages, menus, and settings
 */

export default {
  name: 'Website',
  technicalName: 'website',
  version: '1.0.0',
  summary: 'Website & CMS',
  description: '# Website Module\n\nPublic website content management:\n\n- **Pages** - Create and publish web pages with rich content\n- **Menus** - Navigation menu management\n- **Media** - Image and file uploads\n- **Settings** - Site name, logo, SEO defaults\n- **SEO** - Meta tags, Open Graph, sitemap',
  author: 'Gawdesy',
  website: 'https://gawdesy.org',
  license: 'MIT',
  category: 'Website',

  application: true,
  installable: true,
  autoInstall: false,

  depends: ['base', 'editor'],

  models: ['models/schema.js'],
  api: ['website.routes.js'],
  services: ['services/page.service.js'],

  frontend: {
    views: [
      'views/pages.vue',
      'views/page-editor.vue',
      'views/menus.vue',
      'views/media.vue',
      'views/settings.vue',
    ],
    menus: [
      {
        name: 'Website',
        path: '/website',
        icon: 'lucide:globe',
        sequence: 25,
        children: [
          { name: 'Pages', path: '/website/pages', icon: 'lucide:file-text', sequence: 1 },
          { name: 'Menus', path: '/website/menus', icon: 'lucide:menu', sequence: 2 },
          { name: 'Media', path: '/website/media', icon: 'lucide:image', sequence: 3 },
          { name: 'Settings', path: '/website/settings', icon: 'lucide:settings', sequence: 4 },
        ]
      }
    ]
  },

  permissions: [
    'website.page.read',
    'website.page.create',
    'website.page.edit',
    'website.page.delete',
    'website.page.publish',
    'website.menu.read',
    'website.menu.manage',
    'website.media.read',
    'website.media.upload',
    'website.media.delete',
    'website.settings.read',
    'website.settings.edit',
  ]
}
