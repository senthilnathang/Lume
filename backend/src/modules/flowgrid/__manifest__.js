export default {
  name: 'FlowGrid',
  technicalName: 'flowgrid',
  version: '1.0.0',
  depends: ['base'],
  application: true,
  installable: true,
  autoInstall: false,

  models: ['models/index.js'],
  api: ['api/index.js'],
  services: ['services/index.js'],

  frontend: {
    routes: [
      { path: '/flowgrid', component: 'views/workflow-list.vue' },
      { path: '/flowgrid/:id/editor', component: 'views/workflow-editor.vue' },
      { path: '/flowgrid/:id/executions', component: 'views/execution-list.vue' }
    ],
    menus: [
      {
        name: 'FlowGrid',
        path: '/flowgrid',
        icon: 'lucide:workflow',
        sequence: 80,
        viewName: 'workflow-list'
      }
    ]
  },

  permissions: [
    { name: 'flowgrid.read', description: 'View workflows', group: 'FlowGrid' },
    { name: 'flowgrid.write', description: 'Create/edit workflows', group: 'FlowGrid' },
    { name: 'flowgrid.delete', description: 'Delete workflows', group: 'FlowGrid' },
    { name: 'flowgrid.execute', description: 'Execute workflows', group: 'FlowGrid' },
    { name: 'flowgrid.script', description: 'Execute script nodes (admin only)', group: 'FlowGrid' }
  ]
};
