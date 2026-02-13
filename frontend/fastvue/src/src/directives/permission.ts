import type { App, Directive, DirectiveBinding } from 'vue';

import type { PermissionCode } from '#/store/permission';

import { usePermissionStore } from '#/store/permission';

/**
 * Permission directive for showing/hiding elements based on user permissions
 *
 * Usage:
 * <button v-permission="'employee:create'">Add Employee</button>
 * <button v-permission="['employee:edit', 'employee:delete']">Edit/Delete</button>
 * <button v-permission:all="['employee:edit', 'employee:view']">Requires both</button>
 */
const permissionDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const permissionStore = usePermissionStore();
    const { value, arg } = binding;

    if (!value) {
      return;
    }

    let hasAccess = false;

    if (arg === 'all' && Array.isArray(value)) {
      // Check if user has ALL permissions
      hasAccess = permissionStore.hasAllPermissions(value as PermissionCode[]);
    } else {
      // Check if user has ANY permission
      hasAccess = permissionStore.hasPermission(value as PermissionCode | PermissionCode[]);
    }

    if (!hasAccess) {
      // Remove element from DOM
      el.parentNode?.removeChild(el);
    }
  },
};

/**
 * Role directive for showing/hiding elements based on user roles
 *
 * Usage:
 * <div v-role="'admin'">Admin only content</div>
 * <div v-role="['admin', 'hr_manager']">Admin or HR Manager</div>
 */
const roleDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const permissionStore = usePermissionStore();
    const { value } = binding;

    if (!value) {
      return;
    }

    const hasAccess = permissionStore.hasRole(value);

    if (!hasAccess) {
      // Remove element from DOM
      el.parentNode?.removeChild(el);
    }
  },
};

/**
 * Register all permission directives
 */
export function setupPermissionDirectives(app: App) {
  app.directive('permission', permissionDirective);
  app.directive('role', roleDirective);
}

export { permissionDirective, roleDirective };
