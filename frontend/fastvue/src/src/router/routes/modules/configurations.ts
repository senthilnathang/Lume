import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';
import ModuleView from '#/components/module/ModuleView.vue';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:sliders-horizontal',
      order: 98,
      title: 'Configurations',
      authority: ['superuser'],
    },
    name: 'Configurations',
    path: '/configurations',
    redirect: '/configurations/modules',
    children: [
      // Appearance
      {
        name: 'ConfigAppearance',
        path: 'appearance',
        component: () => import('#/views/configurations/appearance.vue'),
        meta: {
          icon: 'lucide:palette',
          title: 'Appearance',
          authority: ['superuser'],
        },
      },

      // Modules
      {
        name: 'ConfigModules',
        path: 'modules',
        component: ModuleView,
        props: { moduleName: 'base', viewName: 'modules' },
        meta: {
          icon: 'lucide:puzzle',
          title: 'Modules',
          authority: ['superuser'],
        },
      },

      // ========================================
      // Data Management Section
      // ========================================
      {
        name: 'ConfigDataManagement',
        path: 'data',
        redirect: '/configurations/data/activity-timeline',
        meta: {
          icon: 'lucide:database',
          title: 'Data Management',
          authority: ['superuser'],
        },
        children: [
          {
            name: 'ConfigActivityTimeline',
            path: 'activity-timeline',
            component: ModuleView,
            props: { moduleName: 'base', viewName: 'activity-timeline' },
            meta: {
              icon: 'lucide:activity',
              title: 'Activity Timeline',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigPicklists',
            path: 'picklists',
            component: ModuleView,
            props: { moduleName: 'base_customization', viewName: 'picklists' },
            meta: {
              icon: 'lucide:list',
              title: 'Global Picklists',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigDuplicateRules',
            path: 'duplicate-rules',
            component: ModuleView,
            props: { moduleName: 'base_customization', viewName: 'duplicate-rules' },
            meta: {
              icon: 'lucide:copy',
              title: 'Duplicate Rules',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigRecordTypes',
            path: 'record-types',
            component: ModuleView,
            props: { moduleName: 'base_customization', viewName: 'record-types' },
            meta: {
              icon: 'lucide:layers',
              title: 'Record Types',
              authority: ['superuser'],
            },
          },
        ],
      },

      // ========================================
      // Customization Section
      // ========================================
      {
        name: 'ConfigCustomization',
        path: 'customization',
        redirect: '/configurations/customization/entity-builder',
        meta: {
          icon: 'lucide:blocks',
          title: 'Customization',
          authority: ['superuser'],
        },
        children: [
          {
            name: 'ConfigEntityBuilder',
            path: 'entity-builder',
            component: ModuleView,
            props: { moduleName: 'base_customization', viewName: 'entity-builder' },
            meta: {
              icon: 'lucide:boxes',
              title: 'Entity Builder',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigCustomFields',
            path: 'custom-fields',
            component: ModuleView,
            props: { moduleName: 'base_customization', viewName: 'custom-fields' },
            meta: {
              icon: 'lucide:form-input',
              title: 'Custom Fields',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigFormBuilder',
            path: 'form-builder',
            component: ModuleView,
            props: { moduleName: 'base_customization', viewName: 'form-builder' },
            meta: {
              icon: 'lucide:layout-grid',
              title: 'Form Layouts',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigPrintFormats',
            path: 'print-formats',
            component: ModuleView,
            props: { moduleName: 'base_customization', viewName: 'print-formats' },
            meta: {
              icon: 'lucide:printer',
              title: 'Print Formats',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigPrintFormatDesigner',
            path: 'print-format-designer',
            component: ModuleView,
            props: { moduleName: 'base_customization', viewName: 'print-format-designer' },
            meta: {
              icon: 'lucide:file-text',
              title: 'Print Designer',
              hideInMenu: true,
              authority: ['superuser'],
            },
          },
        ],
      },

      // ========================================
      // Migration Management Section
      // ========================================
      {
        name: 'ConfigMigrations',
        path: 'migrations',
        redirect: '/configurations/migrations/dashboard',
        meta: {
          icon: 'lucide:git-branch',
          title: 'Migration Management',
          authority: ['superuser'],
        },
        children: [
          {
            name: 'ConfigMigrationDashboard',
            path: 'dashboard',
            component: ModuleView,
            props: { moduleName: 'base_migration', viewName: 'dashboard' },
            meta: {
              icon: 'lucide:layout-dashboard',
              title: 'Dashboard',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigDeployments',
            path: 'deployments',
            component: ModuleView,
            props: { moduleName: 'base_migration', viewName: 'deployments' },
            meta: {
              icon: 'lucide:rocket',
              title: 'Deployments',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigRecoveryPoints',
            path: 'recovery-points',
            component: ModuleView,
            props: { moduleName: 'base_migration', viewName: 'recovery-points' },
            meta: {
              icon: 'lucide:history',
              title: 'Recovery Points',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigSchemaCompare',
            path: 'compare',
            component: ModuleView,
            props: { moduleName: 'base_migration', viewName: 'compare' },
            meta: {
              icon: 'lucide:git-compare',
              title: 'Schema Compare',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigDriftAlerts',
            path: 'drift',
            component: ModuleView,
            props: { moduleName: 'base_migration', viewName: 'drift' },
            meta: {
              icon: 'lucide:alert-triangle',
              title: 'Drift Alerts',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigFieldTransforms',
            path: 'transforms',
            component: ModuleView,
            props: { moduleName: 'base_migration', viewName: 'transforms' },
            meta: {
              icon: 'lucide:columns',
              title: 'Field Transforms',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigEnvironments',
            path: 'environments',
            component: ModuleView,
            props: { moduleName: 'base_migration', viewName: 'environments' },
            meta: {
              icon: 'lucide:server',
              title: 'Environments',
              authority: ['superuser'],
            },
          },
          {
            name: 'ConfigAuditLog',
            path: 'audit',
            component: ModuleView,
            props: { moduleName: 'base_migration', viewName: 'audit' },
            meta: {
              icon: 'lucide:file-text',
              title: 'Audit Log',
              authority: ['superuser'],
            },
          },
        ],
      },
    ],
  },
  // Hidden routes for detail/form pages (not in menu)
  {
    name: 'BaseHiddenRoutes',
    path: '/base',
    component: BasicLayout,
    meta: {
      hideInMenu: true,
      title: 'Base',
    },
    children: [
      {
        name: 'BaseProfilesForm',
        path: 'profiles-form',
        component: ModuleView,
        props: { moduleName: 'base_security', viewName: 'profiles-form' },
        meta: {
          icon: 'lucide:user-cog',
          title: 'Profile Details',
          hideInMenu: true,
          authority: ['superuser'],
        },
      },
    ],
  },
];

export default routes;
