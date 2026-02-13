import type { ModuleManifest } from '../_types';

export const manifest: ModuleManifest = {
  name: 'base_automation',
  displayName: 'Automation',
  version: '1.0.0',
  description:
    'Enterprise automation — Workflows, Flow Designer, Business Rules, Approval Chains, Webhooks, Email Templates, Validation Rules, Assignment Rules, Rollup Fields',
  category: 'core',
  depends: ['base'],
  autoInstall: true,
  isCore: true,
  icon: 'zap',
};
