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
  author: 'Gawdesy',
  website: 'https://gawdesy.org',
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
    views: ['views/templates.vue'],
    menus: []
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
