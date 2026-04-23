import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class RbacService {
  // 147 core permissions (sample - full list in production)
  private readonly permissionsMap: Record<string, { module: string; action: string }> = {
    'create_user': { module: 'users', action: 'create' },
    'read_user': { module: 'users', action: 'read' },
    'update_user': { module: 'users', action: 'update' },
    'delete_user': { module: 'users', action: 'delete' },
    'manage_roles': { module: 'rbac', action: 'manage' },
    'manage_permissions': { module: 'rbac', action: 'manage_permissions' },
    'create_module': { module: 'modules', action: 'create' },
    'delete_module': { module: 'modules', action: 'delete' },
    'view_audit_logs': { module: 'audit', action: 'view' },
    'create_content': { module: 'content', action: 'create' },
    'edit_content': { module: 'content', action: 'edit' },
    'publish_content': { module: 'content', action: 'publish' },
    'delete_content': { module: 'content', action: 'delete' },
    'view_reports': { module: 'reports', action: 'view' },
    'manage_settings': { module: 'settings', action: 'manage' },
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Check if a user has a specific permission
   * Admin and super_admin roles bypass all permission checks
   * @param userId User ID to check
   * @param permissionCode Permission code to verify
   * @returns boolean indicating if user has permission
   */
  async hasPermission(userId: number, permissionCode: string): Promise<boolean> {
    try {
      // Get user and their role
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) return false;

      // Get user's role
      const userRole = await this.prisma.role.findUnique({
        where: { id: user.role_id },
      });

      if (!userRole) return false;

      // Admin bypass - all permissions granted
      if (this.isAdminRole(userRole.name)) {
        return true;
      }

      // Check role_permission junction table
      const roleHasPermission = await this.prisma.rolePermission.findMany({
        where: {
          roleId: userRole.id,
          permission: {
            name: permissionCode,
          },
        },
      });

      return roleHasPermission.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all permissions for a specific role
   * @param roleId Role ID to fetch permissions for
   * @returns Array of permission codes
   */
  async getRolePermissions(roleId: number): Promise<string[]> {
    try {
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: { roleId: roleId },
        include: { permission: true },
      });

      return rolePermissions.map((rp) => rp.permission.name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if a role is an admin role
   * Admin and super_admin roles have all permissions
   * @param roleName Role name to check
   * @returns boolean indicating if role is admin
   */
  isAdminRole(roleName: string): boolean {
    return ['admin', 'super_admin'].includes(roleName?.toLowerCase());
  }

  /**
   * Get permission metadata by code
   * @param permissionCode Permission code
   * @returns Permission metadata object or undefined
   */
  getPermissionMetadata(permissionCode: string): any {
    return this.permissionsMap[permissionCode];
  }

  /**
   * Check if multiple permissions are granted
   * User must have ALL permissions to pass
   * @param userId User ID to check
   * @param permissionCodes Array of permission codes
   * @returns boolean indicating if user has all permissions
   */
  async hasPermissions(userId: number, permissionCodes: string[]): Promise<boolean> {
    const results = await Promise.all(
      permissionCodes.map((code) => this.hasPermission(userId, code)),
    );
    return results.every((result) => result === true);
  }

  /**
   * Check if user has ANY of the provided permissions
   * @param userId User ID to check
   * @param permissionCodes Array of permission codes
   * @returns boolean indicating if user has at least one permission
   */
  async hasAnyPermission(userId: number, permissionCodes: string[]): Promise<boolean> {
    const results = await Promise.all(
      permissionCodes.map((code) => this.hasPermission(userId, code)),
    );
    return results.some((result) => result === true);
  }
}
