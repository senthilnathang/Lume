import { computed } from 'vue';
import { usePermissionStore } from '@/store/permission';

export function usePermission() {
  const permissionStore = usePermissionStore();

  const permissions = computed(() => permissionStore.permissions);
  const menus = computed(() => permissionStore.menus);

  const hasPermission = (code: string): boolean => {
    return permissionStore.hasPermission(code);
  };

  const hasAnyPermission = (codes: string[]): boolean => {
    return codes.some(code => permissionStore.hasPermission(code));
  };

  const hasAllPermissions = (codes: string[]): boolean => {
    return codes.every(code => permissionStore.hasPermission(code));
  };

  const filterMenusByPermission = <T extends { permission?: string }>(items: T[]): T[] => {
    return items.filter(item => {
      if (!item.permission) return true;
      return permissionStore.hasPermission(item.permission);
    });
  };

  return {
    permissions,
    menus,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    filterMenusByPermission,
  };
}
