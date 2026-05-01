/**
 * Editor Module Manifest
 * TipTap-based WYSIWYG editor with reusable components
 */

export default {
  name: 'Editor',
  technicalName: 'editor',
  version: '1.0.0',
  summary: 'Rich Text Editor',
  description: '# Editor Module\n\nTipTap-based WYSIWYG editor with reusable components:\n\n- **Rich Editor** - Full-featured content editor\n- **Compact Editor** - Minimal editor for forms\n- **Templates** - Reusable page templates\n- **Snippets** - Reusable content blocks',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'Content',

  application: false,
  installable: true,
  autoInstall: true,

  depends: ['base'],

  models: ['models/schema.js'],
  api: ['api/index.js'],
  services: ['services/editor.service.js'],

  frontend: {
    views: ['views/templates.vue', 'views/widget-manager.vue'],
    menus: [
      {
        name: 'Editor',
        icon: 'lucide:layout',
        sequence: 90,
        children: [
          { name: 'Templates', path: '/settings/editor/templates', icon: 'lucide:file-text', sequence: 1, viewName: 'templates' },
          { name: 'Widget Manager', path: '/editor/widget-manager', icon: 'lucide:puzzle', sequence: 2, viewName: 'widget-manager' },
        ],
      },
    ],
  },

  permissions: [
    'editor.template.read',
    'editor.template.create',
    'editor.template.edit',
    'editor.template.delete',
    'editor.snippet.read',
    'editor.snippet.create',
    'editor.snippet.edit',
    'editor.snippet.delete',
  ]
}
