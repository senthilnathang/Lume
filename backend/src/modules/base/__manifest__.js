/**
 * Base Module Manifest
 * Core module providing ORM, security, and module management
 */

export default {
  name: 'Base',
  technicalName: 'base',
  version: '1.0.0',
  summary: 'Core base module with ORM, security, and module management',
  description: '# Base Module\n\nProvides foundational functionality for all modules:\n\n- **ORM Framework** - BaseModel with mixins\n- **CRUD Operations** - Inherit CRUD with record rules\n- **Module Registry** - Track installed modules\n- **Security** - Record rules, permissions\n- **Audit Logging** - Track all changes',
  author: 'Gawdesy',
  website: 'https://gawdesy.org',
  license: 'MIT',
  category: 'System',
  
  application: false, // Technical module
  installable: true,
  autoInstall: true, // Auto-install on system start
  
  // Base has no dependencies
  depends: [],
  
  // Models
  models: ['models/index.js'],
  
  // Services
  services: ['services/index.js'],
  
  // API routes
  api: ['api/index.js'],
  
  // Frontend
  frontend: {
    routes: [],
    views: [],
    menus: [
      {
        name: 'Settings',
        path: '/settings',
        icon: 'lucide:settings',
        sequence: 100,
        children: [
          {
            name: 'Modules',
            path: '/settings/modules',
            icon: 'lucide:package',
            sequence: 1,
            permission: 'base.modules.manage'
          },
          {
            name: 'Menus',
            path: '/settings/menus',
            icon: 'lucide:menu',
            sequence: 2,
            permission: 'base.menus.manage'
          },
          {
            name: 'Users',
            path: '/settings/users',
            icon: 'lucide:users',
            sequence: 3,
            permission: 'base.users.manage'
          },
          {
            name: 'Groups',
            path: '/settings/groups',
            icon: 'lucide:users-round',
            sequence: 4,
            permission: 'base.groups.manage'
          },
          {
            name: 'Roles',
            path: '/settings/roles',
            icon: 'lucide:shield',
            sequence: 5,
            permission: 'base.roles.manage'
          },
          {
            name: 'Permissions',
            path: '/settings/permissions',
            icon: 'lucide:key',
            sequence: 6,
            permission: 'base.permissions.manage'
          },
          {
            name: 'Record Rules',
            path: '/settings/record-rules',
            icon: 'lucide:shield-check',
            sequence: 7,
            permission: 'base.record_rules.manage'
          },
          {
            name: 'Sequences',
            path: '/settings/sequences',
            icon: 'lucide:list-ordered',
            sequence: 8,
            permission: 'base.sequences.manage'
          },
          {
            name: 'System',
            path: '/settings/system',
            icon: 'lucide:server',
            sequence: 9,
            permission: 'base.system.manage'
          }
        ]
      }
    ]
  },
  
  // Permissions
  permissions: [
    // Module management
    { name: 'base.modules.read', description: 'View modules', group: 'Module Management' },
    { name: 'base.modules.write', description: 'Modify modules', group: 'Module Management' },
    { name: 'base.modules.manage', description: 'Install/uninstall modules', group: 'Module Management' },
    
    // Menu management
    { name: 'base.menus.read', description: 'View menus', group: 'Menu Management' },
    { name: 'base.menus.write', description: 'Modify menus', group: 'Menu Management' },
    { name: 'base.menus.manage', description: 'Full menu control', group: 'Menu Management' },
    
    // User management
    { name: 'base.users.read', description: 'View users', group: 'User Management' },
    { name: 'base.users.write', description: 'Modify users', group: 'User Management' },
    { name: 'base.users.manage', description: 'Full user control', group: 'User Management' },
    
    // Group management
    { name: 'base.groups.read', description: 'View groups', group: 'Group Management' },
    { name: 'base.groups.write', description: 'Modify groups', group: 'Group Management' },
    { name: 'base.groups.manage', description: 'Full group control', group: 'Group Management' },
    
    // Role management
    { name: 'base.roles.read', description: 'View roles', group: 'Role Management' },
    { name: 'base.roles.write', description: 'Modify roles', group: 'Role Management' },
    { name: 'base.roles.manage', description: 'Full role control', group: 'Role Management' },
    
    // Permission management
    { name: 'base.permissions.read', description: 'View permissions', group: 'Permission Management' },
    { name: 'base.permissions.write', description: 'Modify permissions', group: 'Permission Management' },
    { name: 'base.permissions.manage', description: 'Full permission control', group: 'Permission Management' },
    
    // Record rules
    { name: 'base.record_rules.read', description: 'View record rules', group: 'Record Rules' },
    { name: 'base.record_rules.write', description: 'Modify record rules', group: 'Record Rules' },
    { name: 'base.record_rules.manage', description: 'Full record rule control', group: 'Record Rules' },
    
    // Sequences
    { name: 'base.sequences.read', description: 'View sequences', group: 'Sequences' },
    { name: 'base.sequences.write', description: 'Modify sequences', group: 'Sequences' },
    { name: 'base.sequences.manage', description: 'Full sequence control', group: 'Sequences' },
    
    // System
    { name: 'base.system.read', description: 'View system settings', group: 'System' },
    { name: 'base.system.write', description: 'Modify system settings', group: 'System' },
    { name: 'base.system.manage', description: 'Full system control', group: 'System' }
  ],
  
  // Hooks
  preInit: null,
  postInit: null,
  
  // Settings schema
  settings: {
    company_name: {
      type: 'string',
      default: 'Gawdesy',
      label: 'Company Name'
    },
    company_email: {
      type: 'string',
      default: 'support@gawdesy.org',
      label: 'Company Email'
    },
    timezone: {
      type: 'string',
      default: 'UTC',
      label: 'Default Timezone'
    },
    date_format: {
      type: 'string',
      default: 'YYYY-MM-DD',
      label: 'Date Format'
    },
    time_format: {
      type: 'string',
      default: 'HH:mm:ss',
      label: 'Time Format'
    },
    session_timeout: {
      type: 'number',
      default: 30,
      label: 'Session Timeout (minutes)'
    },
    max_upload_size: {
      type: 'number',
      default: 10485760,
      label: 'Max Upload Size (bytes)'
    },
    allowed_file_types: {
      type: 'array',
      default: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
      label: 'Allowed File Types'
    }
  }
};
