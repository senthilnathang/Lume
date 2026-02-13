import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:settings',
      order: 99,
      title: 'Settings',
      // Superusers always have access; other users need at least one admin permission
      authority: ['superuser', 'user.read', 'group.read', 'permission.read', 'company.read', 'role.read', 'activity.read', 'settings.read', 'security.read', 'rls.read', 'acl.read'],
    },
    name: 'Settings',
    path: '/settings',
    redirect: '/settings/invitations',
    children: [
      // User Invitations (first item)
      {
        name: 'Invitations',
        path: 'invitations',
        component: () => import('#/views/settings/invitations/index.vue'),
        meta: {
          icon: 'lucide:mail-plus',
          title: 'Invitations',
          authority: ['superuser', 'user.create'],
        },
      },
      {
        name: 'InvitationCreate',
        path: 'invitations/create',
        component: () => import('#/views/settings/invitations/form.vue'),
        meta: {
          icon: 'lucide:send',
          title: 'Send Invitation',
          hideInMenu: true,
          authority: ['superuser', 'user.create'],
        },
      },
      // User Management
      {
        name: 'UserSettings',
        path: 'users',
        component: () => import('#/views/settings/users.vue'),
        meta: {
          icon: 'lucide:users',
          title: 'Users',
          authority: ['superuser', 'user.read'],
        },
      },
      {
        name: 'UserCreate',
        path: 'users/create',
        component: () => import('#/views/user/form.vue'),
        meta: {
          icon: 'lucide:user-plus',
          title: 'Create User',
          hideInMenu: true,
          authority: ['superuser', 'user.create'],
        },
      },
      {
        name: 'UserEdit',
        path: 'users/:id/edit',
        component: () => import('#/views/user/form.vue'),
        meta: {
          icon: 'lucide:user',
          title: 'Edit User',
          hideInMenu: true,
          authority: ['superuser', 'user.update'],
        },
      },
      // Group Management
      {
        name: 'GroupSettings',
        path: 'groups',
        component: () => import('#/views/settings/groups.vue'),
        meta: {
          icon: 'lucide:shield',
          title: 'Groups',
          authority: ['superuser', 'group.read'],
        },
      },
      {
        name: 'GroupCreate',
        path: 'groups/create',
        component: () => import('#/views/group/form.vue'),
        meta: {
          icon: 'lucide:shield-plus',
          title: 'Create Group',
          hideInMenu: true,
          authority: ['superuser', 'group.create'],
        },
      },
      {
        name: 'GroupEdit',
        path: 'groups/:id/edit',
        component: () => import('#/views/group/form.vue'),
        meta: {
          icon: 'lucide:shield',
          title: 'Edit Group',
          hideInMenu: true,
          authority: ['superuser', 'group.update'],
        },
      },
      // Permission Management
      {
        name: 'PermissionSettings',
        path: 'permissions',
        component: () => import('#/views/settings/permissions.vue'),
        meta: {
          icon: 'lucide:key',
          title: 'Permissions',
          authority: ['superuser', 'permission.read'],
        },
      },
      // Role Management
      {
        name: 'RoleSettings',
        path: 'roles',
        component: () => import('#/views/settings/roles.vue'),
        meta: {
          icon: 'lucide:shield-check',
          title: 'Roles',
          authority: ['superuser', 'role.read'],
        },
      },
      {
        name: 'RoleCreate',
        path: 'roles/create',
        component: () => import('#/views/role/form.vue'),
        meta: {
          icon: 'lucide:shield-plus',
          title: 'Create Role',
          hideInMenu: true,
          authority: ['superuser', 'role.create'],
        },
      },
      {
        name: 'RoleEdit',
        path: 'roles/:id/edit',
        component: () => import('#/views/role/form.vue'),
        meta: {
          icon: 'lucide:shield-check',
          title: 'Edit Role',
          hideInMenu: true,
          authority: ['superuser', 'role.update'],
        },
      },
      // Activity Logs
      {
        name: 'ActivityLogs',
        path: 'activity-logs',
        component: () => import('#/views/settings/activity-logs.vue'),
        meta: {
          icon: 'lucide:file-text',
          title: 'Activity Logs',
          authority: ['superuser', 'activity.read'],
        },
      },
      // Note: Data Import moved to Configurations/Data Management/Import-Export
      // Security Settings
      {
        name: 'SecuritySettings',
        path: 'security',
        component: () => import('#/views/settings/security.vue'),
        meta: {
          icon: 'lucide:shield-check',
          title: 'Security',
          authority: ['superuser', 'security.read'],
        },
      },
      // Row Level Security (RLS)
      {
        name: 'RLSSettings',
        path: 'rls',
        component: () => import('#/views/settings/rls.vue'),
        meta: {
          icon: 'lucide:lock',
          title: 'Row Level Security',
          authority: ['superuser', 'rls.read'],
        },
      },
       // Access Control Lists (ACL)
       {
         name: 'ACLSettings',
         path: 'acl',
         component: () => import('#/views/settings/acl.vue'),
         meta: {
           icon: 'lucide:shield',
           title: 'Access Control Lists',
           authority: ['superuser', 'acl.read'],
         },
       },
      // Menu Access Management
      {
        name: 'MenuAccess',
        path: 'menu-access',
        component: () => import('#/views/settings/menu-access/index.vue'),
        meta: {
          icon: 'lucide:menu',
          title: 'Menu Access',
          authority: ['superuser', 'menu.manage'],
        },
      },
      {
        name: 'MenuAccessCreate',
        path: 'menu-access/create',
        component: () => import('#/views/settings/menu-access/form.vue'),
        meta: {
          icon: 'lucide:plus',
          title: 'Add Menu Permission',
          hideInMenu: true,
          authority: ['superuser', 'menu.manage'],
        },
      },
      {
        name: 'MenuAccessEdit',
        path: 'menu-access/edit/:id',
        component: () => import('#/views/settings/menu-access/form.vue'),
        meta: {
          icon: 'lucide:edit',
          title: 'Edit Menu Permission',
          hideInMenu: true,
          authority: ['superuser', 'menu.manage'],
        },
      },
      // Note: Business Rules, Workflows, Approval Chains, and Dashboard Builder
      // are now in Configurations menu only (no duplication)
      // - Business Rules: /configurations/automation/business-rules
      // - Workflows: /configurations/automation/workflows
      // - Approval Chains: /configurations/automation/approval-chains
      // - Dashboard Builder: /configurations/customization/dashboard-builder

      // Notification Preferences moved to inbox module
      // Company Management
      {
        name: 'CompaniesManagement',
        path: 'companies',
        component: () => import('#/views/settings/companies.vue'),
        meta: {
          icon: 'lucide:building-2',
          title: 'Companies',
          authority: ['superuser', 'company.read'],
        },
      },
      {
        name: 'CompanyCreate',
        path: 'companies/create',
        component: () => import('#/views/company/form.vue'),
        meta: {
          icon: 'lucide:building-2',
          title: 'Create Company',
          hideInMenu: true,
          authority: ['superuser', 'company.create'],
        },
      },
      {
        name: 'CompanyEdit',
        path: 'companies/:id/edit',
        component: () => import('#/views/company/form.vue'),
        meta: {
          icon: 'lucide:building-2',
          title: 'Edit Company',
          hideInMenu: true,
          authority: ['superuser', 'company.update'],
        },
      },
    ],
  },
];

export default routes;
