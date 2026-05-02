/**
 * Compliance & Audit Tracking Module Manifest
 */

export default {
  name: 'Compliance & Audit Tracking',
  technicalName: 'compliance',
  version: '1.0.0',
  summary: 'Compliance rules and comprehensive audit logging',
  description: '# Compliance & Audit Tracking Module\n\nComprehensive compliance and audit tracking:\n\n- **Compliance Rules** - Define and manage compliance requirements\n- **Audit Logging** - Log all compliance-relevant actions\n- **Compliance Reports** - Generate compliance status reports\n- **Audit Trail** - Complete audit trail for any entity',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'Security',

  application: true,
  installable: true,
  autoInstall: false,

  depends: ['base'],

  models: ['models/index.js'],
  api: ['compliance.routes.js'],
  services: [],

  frontend: {
    routes: [],
    views: [],
    locales: [],
    menus: [],
  },

  permissions: [
    'compliance.rules.read',
    'compliance.rules.create',
    'compliance.rules.update',
    'compliance.rules.delete',
    'compliance.audit.read',
    'compliance.reports.read',
    'compliance.reports.create',
  ],
};
