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
  author: 'Lume',
  website: 'https://lume.dev',
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
          { name: 'Pages', path: '/website/pages', icon: 'lucide:file-text', sequence: 1, viewName: 'pages' },
          { name: 'Menus', path: '/website/menus', icon: 'lucide:menu', sequence: 2, viewName: 'menus' },
          { name: 'Media', path: '/website/media', icon: 'lucide:image', sequence: 3, viewName: 'media' },
          { name: 'Forms', path: '/website/forms', icon: 'lucide:file-input', sequence: 4, viewName: 'forms' },
          { name: 'Theme Builder', path: '/website/theme-builder', icon: 'lucide:layout', sequence: 5, viewName: 'theme-builder' },
          { name: 'Popups', path: '/website/popups', icon: 'lucide:maximize-2', sequence: 6, viewName: 'popups' },
          { name: 'Settings', path: '/website/settings', icon: 'lucide:settings', sequence: 7, viewName: 'settings' },
          { name: 'Redirects', path: '/website/redirects', icon: 'ArrowLeftRight', sequence: 8, viewName: 'redirects' },
          { name: 'Categories', path: '/website/categories', icon: 'lucide:tag', sequence: 9, viewName: 'categories' },
          { name: 'Tags', path: '/website/tags', icon: 'lucide:hash', sequence: 10, viewName: 'tags' },
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
    'website.form.read',
    'website.form.create',
    'website.form.edit',
    'website.form.delete',
    'website.submission.read',
    'website.submission.delete',
    'website.settings.read',
    'website.settings.edit',
    'website.theme.read',
    'website.theme.create',
    'website.theme.edit',
    'website.theme.delete',
    'website.popup.read',
    'website.popup.create',
    'website.popup.edit',
    'website.popup.delete',
    'website.redirect.read',
    'website.redirect.manage',
    'website.category.read',
    'website.category.manage',
    'website.tag.read',
    'website.tag.manage',
  ]
}
