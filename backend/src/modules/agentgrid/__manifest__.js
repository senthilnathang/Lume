export default {
  name: 'AgentGrid',
  technicalName: 'agentgrid',
  version: '1.0.0',
  depends: ['base', 'flowgrid'],
  application: true,
  installable: true,
  autoInstall: false,

  models: ['models/index.js'],
  services: ['services/index.js'],

  frontend: {
    routes: [
      { path: '/agentgrid', viewName: 'grid-list', component: 'views/grid-list.vue' },
      { path: '/agentgrid/:gridId/agents', viewName: 'agent-list', component: 'views/agent-list.vue' },
      { path: '/agentgrid/:gridId/agents/:agentId/executions', viewName: 'execution-list', component: 'views/execution-list.vue' }
    ],
    menus: [
      {
        name: 'AgentGrid',
        path: '/agentgrid',
        icon: 'lucide:bot',
        sequence: 81,
        viewName: 'grid-list'
      }
    ]
  },

  permissions: [
    { name: 'agentgrid.read', description: 'View agent grids', group: 'AgentGrid' },
    { name: 'agentgrid.write', description: 'Create/edit agents', group: 'AgentGrid' },
    { name: 'agentgrid.delete', description: 'Delete agents', group: 'AgentGrid' },
    { name: 'agentgrid.execute', description: 'Execute agents', group: 'AgentGrid' }
  ]
};
