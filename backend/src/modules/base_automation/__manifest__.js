/**
 * Base Automation Module Manifest
 * Workflow and automation features
 */

export default {
  name: 'Base Automation',
  technicalName: 'base_automation',
  version: '1.0.0',
  summary: 'Automation and workflow management module',
  description: '# Base Automation Module\n\nWorkflow and automation features:\n\n- **Workflows** - State machine workflows\n- **Flows** - Visual flow designer\n- **Business Rules** - Automatic field change detection\n- **Approval Chains** - Multi-step approvals\n- **Scheduled Actions** - Cron job automation\n- **Email Templates** - Email automation',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'System',
  
  application: false,
  installable: true,
  autoInstall: true,
  
  depends: ['base'],
  
  models: ['models/index.js'],
  services: ['services/index.js'],
  api: ['api/index.js'],
  
  frontend: {
    routes: [],
    views: [
      'views/automation.vue',
      'views/workflows.vue',
      'views/workflow-form.vue',
      'views/workflow-designer.vue',
      'views/workflow-execution.vue',
      'views/flows-list.vue',
      'views/flow-designer.vue',
      'views/business-rules.vue',
      'views/business-rules-form.vue',
      'views/approval-chains.vue',
      'views/approval-chains-form.vue',
      'views/approvals-inbox.vue',
      'views/validation-rules.vue',
      'views/validation-rules-form.vue',
      'views/assignment-rules.vue',
      'views/assignment-rules-form.vue',
      'views/rollup-fields.vue',
      'views/rollup-fields-form.vue',
    ],
    menus: [
      {
        name: 'Automation',
        path: '/settings/automation',
        icon: 'lucide:zap',
        sequence: 6,
        permission: 'base_automation.access',
        children: [
          {
            name: 'Workflows',
            path: '/settings/automation/workflows',
            icon: 'lucide:git-merge',
            sequence: 1,
            permission: 'base_automation.workflows.manage',
            viewName: 'workflows'
          },
          {
            name: 'Flows',
            path: '/settings/automation/flows',
            icon: 'lucide:git-branch',
            sequence: 2,
            permission: 'base_automation.flows.manage',
            viewName: 'flows-list'
          },
          {
            name: 'Business Rules',
            path: '/settings/automation/business-rules',
            icon: 'lucide:book-open',
            sequence: 3,
            permission: 'base_automation.rules.manage',
            viewName: 'business-rules'
          },
          {
            name: 'Approval Chains',
            path: '/settings/automation/approvals',
            icon: 'lucide:check-circle',
            sequence: 4,
            permission: 'base_automation.approvals.manage',
            viewName: 'approval-chains'
          },
          {
            name: 'Scheduled Actions',
            path: '/settings/automation/scheduled',
            icon: 'lucide:clock',
            sequence: 5,
            permission: 'base_automation.scheduled.manage',
            viewName: 'automation'
          }
        ]
      }
    ]
  },
  
  permissions: [
    { name: 'base_automation.access', description: 'Access automation', group: 'Automation' },
    { name: 'base_automation.workflows', description: 'View workflows', group: 'Automation' },
    { name: 'base_automation.workflows.manage', description: 'Manage workflows', group: 'Automation' },
    { name: 'base_automation.flows', description: 'View flows', group: 'Automation' },
    { name: 'base_automation.flows.manage', description: 'Manage flows', group: 'Automation' },
    { name: 'base_automation.rules', description: 'View business rules', group: 'Automation' },
    { name: 'base_automation.rules.manage', description: 'Manage business rules', group: 'Automation' },
    { name: 'base_automation.approvals', description: 'View approvals', group: 'Automation' },
    { name: 'base_automation.approvals.manage', description: 'Manage approvals', group: 'Automation' },
    { name: 'base_automation.scheduled', description: 'View scheduled', group: 'Automation' },
    { name: 'base_automation.scheduled.manage', description: 'Manage scheduled', group: 'Automation' }
  ]
};
