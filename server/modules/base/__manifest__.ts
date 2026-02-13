import type { ModuleManifest } from '../_types';

export const manifest: ModuleManifest = {
  name: 'base',
  displayName: 'Base',
  version: '1.0.0',
  description: 'Core module providing record rules, sequences, scheduled actions, and module registry',
  category: 'core',
  author: 'Lume',
  depends: [],
  autoInstall: true,
  isCore: true,
  icon: 'box',
  color: '#2E7D32',
};
