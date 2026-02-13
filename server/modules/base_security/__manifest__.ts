import type { ModuleManifest } from '../_types';

export const manifest: ModuleManifest = {
  name: 'base_security',
  displayName: 'Security',
  version: '1.0.0',
  description:
    'Enterprise security — Profiles, Permission Sets, OWD, Sharing Rules, Field-Level Security, Policy Engine, ABAC, Zero Trust',
  category: 'core',
  depends: ['base'],
  autoInstall: true,
  isCore: true,
  icon: 'shield',
};
