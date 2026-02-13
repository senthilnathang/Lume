import type { ModuleManifest } from '../_types';

export const manifest: ModuleManifest = {
  name: 'base_customization',
  displayName: 'Customization',
  version: '1.0.0',
  description:
    'Enterprise customization — Entity Builder, Custom Fields, Form Builder, Print Formats, Global Picklists, Duplicate Detection, Record Types',
  category: 'core',
  depends: ['base'],
  autoInstall: true,
  isCore: true,
  icon: 'puzzle',
};
