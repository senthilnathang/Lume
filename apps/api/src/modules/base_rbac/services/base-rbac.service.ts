import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { RbacService } from '@core/services/rbac.service';

/**
 * BaseRbacService
 * Provides foundational RBAC permission checking primitives
 * using core Prisma models (Role, Permission, RolePermission)
 */
@Injectable()
export class BaseRbacService {
  constructor(private prisma: PrismaService) {}

  // Both RBAC entry points use the same persisted identity and permission rules.
  async hasPermission(userId: number, permissionCode: string): Promise<boolean> {
    return new RbacService(this.prisma).hasPermission(userId, permissionCode);
  }

  async hasAnyPermission(userId: number, permissionCodes: string[]): Promise<boolean> {
    return new RbacService(this.prisma).hasAnyPermission(userId, permissionCodes ?? []);
  }

  async hasAllPermissions(userId: number, permissionCodes: string[]): Promise<boolean> {
    return new RbacService(this.prisma).hasPermissions(userId, permissionCodes ?? []);
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    return new RbacService(this.prisma).getUserPermissions(userId);
  }

  async getRolePermissions(roleId: number): Promise<string[]> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role?.isActive) return [];
    const rbac = new RbacService(this.prisma);
    return rbac.isAdminRole(role.name) ? ['*'] : rbac.getRolePermissions(roleId);
  }

  /**
   * Get user's role
   * @param userId - User ID
   * @returns Role object or null
   */
  async getUserRole(userId: number): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });

      return user?.role || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all roles
   * @returns Array of roles
   */
  async getAllRoles(): Promise<any[]> {
    try {
      return await this.prisma.role.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all permissions
   * @returns Array of permissions
   */
  async getAllPermissions(): Promise<any[]> {
    try {
      return await this.prisma.permission.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * Get permissions grouped by module
   * @returns Object with module names as keys and permission arrays as values
   */
  async getPermissionsGrouped(): Promise<Record<string, any[]>> {
    try {
      const permissions = await this.prisma.permission.findMany({
        orderBy: { name: 'asc' },
      });

      const grouped: Record<string, any[]> = {};
      for (const permission of permissions) {
        const module = permission.name.split('.')[0];
        if (!grouped[module]) {
          grouped[module] = [];
        }
        grouped[module].push(permission);
      }

      return grouped;
    } catch (error) {
      return {};
    }
  }
}
