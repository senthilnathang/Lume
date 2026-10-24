import { PluginManifest } from '@core/plugin/plugin-registry.service';

/**
 * Example plugin manifest demonstrating the plugin system
 * This shows how plugins extend Lume with custom entities, workflows, and permissions
 */
export const ExamplePluginManifest: PluginManifest = {
  name: 'lume-example-plugin',
  displayName: 'Example Plugin',
  version: '1.0.0',
  compatibility: '>=2.0.0',
  author: 'Lume Team',
  description: 'Example plugin demonstrating the Lume plugin system',

  dependencies: {
    'lume-base': '>=2.0.0',
  },

  entrypoint: 'dist/index.js',

  permissions: [
    'example.read',
    'example.write',
    'example.delete',
  ],

  dbPrefix: 'example_',

  hooks: {
    onInstall: 'migrations/001_create_tables.sql',
    onUninstall: 'migrations/001_drop_tables.sql',
  },
};

/**
 * Example: CRM Plugin Manifest
 * A more complex plugin with multiple entities and dependencies
 */
export const CRMPluginManifest: PluginManifest = {
  name: 'lume-crm-pro',
  displayName: 'CRM Pro',
  version: '2.1.0',
  compatibility: '>=2.0.0',
  author: 'CRM Vendor',
  description: 'Professional CRM extension with sales pipeline, forecasting, and analytics',

  dependencies: {
    'lume-base': '>=2.0.0',
    'lume-email-integration': '>=1.0.0',
  },

  entrypoint: 'dist/crm-module.js',

  permissions: [
    'crm.leads.read',
    'crm.leads.write',
    'crm.leads.delete',
    'crm.opportunities.read',
    'crm.opportunities.write',
    'crm.pipeline.forecast',
    'crm.reports.view',
    'crm.analytics.export',
  ],

  dbPrefix: 'crm_pro_',

  hooks: {
    onInstall: 'migrations/001_create_crm_schema.sql',
    onUninstall: 'migrations/rollback_crm_schema.sql',
  },
};
