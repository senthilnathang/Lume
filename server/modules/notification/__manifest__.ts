import type { ModuleManifest } from '../_types';

export const manifest: ModuleManifest = {
  name: 'notification',
  displayName: 'Notifications',
  version: '1.0.0',
  description: 'Notification system — in-app notifications, email, push',
  category: 'core',
  depends: ['base'],
  autoInstall: true,
  isCore: true,
  icon: 'bell',
};
