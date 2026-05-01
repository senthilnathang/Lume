/**
 * Base Security Module Manifest
 * Security and access control features
 */

export default {
  name: 'Base Security',
  technicalName: 'base_security',
  version: '1.0.0',
  summary: 'Security and access control module',
  description: '# Base Security Module\n\nAdvanced security features:\n\n- **Access Control** - IP whitelist/blacklist\n- **Two-Factor Authentication** - 2FA management\n- **Session Management** - Active sessions tracking\n- **Security Logs** - Security event logging\n- **API Keys** - API key management',
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
    views: [],
    menus: [
      {
        name: 'Security',
        path: '/settings/security',
        icon: 'lucide:shield-check',
        sequence: 4,
        permission: 'base_security.access',
        children: [
          {
            name: 'Access Control',
            path: '/settings/security/access',
            icon: 'lucide:lock',
            sequence: 1,
            permission: 'base_security.access.manage'
          },
          {
            name: '2FA',
            path: '/settings/security/2fa',
            icon: 'lucide:smartphone',
            sequence: 2,
            permission: 'base_security.2fa.manage'
          },
          {
            name: 'Sessions',
            path: '/settings/security/sessions',
            icon: 'lucide:clock',
            sequence: 3,
            permission: 'base_security.sessions.manage'
          },
          {
            name: 'API Keys',
            path: '/settings/security/api-keys',
            icon: 'lucide:key',
            sequence: 4,
            permission: 'base_security.api_keys.manage'
          }
        ]
      }
    ]
  },
  
  permissions: [
    { name: 'base_security.access', description: 'Access security settings', group: 'Security' },
    { name: 'base_security.access.manage', description: 'Manage access control', group: 'Security' },
    { name: 'base_security.2fa', description: 'Manage 2FA', group: 'Security' },
    { name: 'base_security.2fa.manage', description: 'Manage 2FA settings', group: 'Security' },
    { name: 'base_security.sessions', description: 'View sessions', group: 'Security' },
    { name: 'base_security.sessions.manage', description: 'Manage sessions', group: 'Security' },
    { name: 'base_security.api_keys', description: 'View API keys', group: 'Security' },
    { name: 'base_security.api_keys.manage', description: 'Manage API keys', group: 'Security' }
  ]
};
