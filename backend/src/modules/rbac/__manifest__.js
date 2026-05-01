/**
 * RBAC Module Manifest
 * Advanced Role-Based Access Control
 */

export default {
  name: 'RBAC',
  technicalName: 'rbac',
  version: '1.0.0',
  summary: 'Advanced role-based access control module',
  description: '# RBAC Module\n\nAdvanced access control:\n\n- **Roles** - Define user roles with specific permissions\n- **Permissions** - Granular permission management\n- **Access Rules** - Record-level access control\n- **Field Security** - Field-level visibility control',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'System',
  
  application: true,
  installable: true,
  autoInstall: false,
  
  depends: ['base'],
  
  models: ['models/index.js'],
  api: ['api/index.js'],
  services: ['services/index.js'],
  
  frontend: {
    routes: ['routes.ts'],
    views: ['views/roles.vue', 'views/permissions.vue', 'views/access-rules.vue'],
    menus: [
      {
        name: 'Access Control',
        path: '/settings/rbac',
        icon: 'lucide:shield',
        sequence: 15,
        permission: 'rbac.access',
        children: [
          { name: 'Roles', path: '/settings/rbac/roles', icon: 'lucide:users', sequence: 1, permission: 'rbac.roles.read' },
          { name: 'Permissions', path: '/settings/rbac/permissions', icon: 'lucide:key', sequence: 2, permission: 'rbac.permissions.read' },
          { name: 'Access Rules', path: '/settings/rbac/access-rules', icon: 'lucide:file-lock', sequence: 3, permission: 'rbac.rules.read' },
          { name: 'Audit', path: '/settings/rbac/audit', icon: 'lucide:history', sequence: 4, permission: 'rbac.audit.read' }
        ]
      }
    ]
  },
  
  permissions: [
    { name: 'rbac.access', description: 'Access RBAC settings', group: 'RBAC' },
    { name: 'rbac.roles.read', description: 'View roles', group: 'RBAC' },
    { name: 'rbac.roles.write', description: 'Create/Edit roles', group: 'RBAC' },
    { name: 'rbac.roles.delete', description: 'Delete roles', group: 'RBAC' },
    { name: 'rbac.permissions.read', description: 'View permissions', group: 'RBAC' },
    { name: 'rbac.permissions.write', description: 'Manage permissions', group: 'RBAC' },
    { name: 'rbac.rules.read', description: 'View access rules', group: 'RBAC' },
    { name: 'rbac.rules.write', description: 'Manage access rules', group: 'RBAC' },
    { name: 'rbac.audit.read', description: 'View RBAC audit log', group: 'RBAC' }
  ]
}
