import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

/**
 * BaseRbacService
 * Provides foundational RBAC permission checking primitives
 * using core Prisma models (Role, Permission, RolePermission)
 */
@Injectable()
export class BaseRbacService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a user has a specific permission
   * @param userId - User ID
   * @param permissionCode - Permission code (e.g., 'base.users.read')
   * @returns true if user has permission, false otherwise
   */
  async hasPermission(userId: number, permissionCode: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.role) {
        return false;
      }

      // Super admin has all permissions
      if (user.role.name === 'super_admin' || user.role.name === 'admin') {
        return true;
      }

      // Check if permission exists in role's permissions
      return user.role.rolePermissions.some(
        (rp) => rp.permission.code === permissionCode,
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a user has any of the provided permissions
   * @param userId - User ID
   * @param permissionCodes - Array of permission codes
   * @returns true if user has any of the permissions, false otherwise
   */
  async hasAnyPermission(
    userId: number,
    permissionCodes: string[],
  ): Promise<boolean> {
    try {
      if (!permissionCodes || permissionCodes.length === 0) {
        return false;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.role) {
        return false;
      }

      // Super admin has all permissions
      if (user.role.name === 'super_admin' || user.role.name === 'admin') {
        return true;
      }

      // Check if any permission exists in role's permissions
      return user.role.rolePermissions.some((rp) =>
        permissionCodes.includes(rp.permission.code),
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a user has all of the provided permissions
   * @param userId - User ID
   * @param permissionCodes - Array of permission codes
   * @returns true if user has all permissions, false otherwise
   */
  async hasAllPermissions(
    userId: number,
    permissionCodes: string[],
  ): Promise<boolean> {
    try {
      if (!permissionCodes || permissionCodes.length === 0) {
        return true;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.role) {
        return false;
      }

      // Super admin has all permissions
      if (user.role.name === 'super_admin' || user.role.name === 'admin') {
        return true;
      }

      // Check if all permissions exist in role's permissions
      const userPermissions = new Set(
        user.role.rolePermissions.map((rp) => rp.permission.code),
      );
      return permissionCodes.every((code) => userPermissions.has(code));
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all permissions for a user
   * @param userId - User ID
   * @returns Array of permission codes
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.role) {
        return [];
      }

      // Super admin has wildcard permission
      if (user.role.name === 'super_admin' || user.role.name === 'admin') {
        return ['*'];
      }

      return user.role.rolePermissions.map((rp) => rp.permission.code);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all permissions for a role
   * @param roleId - Role ID
   * @returns Array of permission codes
   */
  async getRolePermissions(roleId: number): Promise<string[]> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!role) {
        return [];
      }

      // System admin roles have wildcard
      if (role.name === 'super_admin' || role.name === 'admin') {
        return ['*'];
      }

      return role.rolePermissions.map((rp) => rp.permission.code);
    } catch (error) {
      return [];
    }
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
        orderBy: { code: 'asc' },
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
        orderBy: { code: 'asc' },
      });

      const grouped: Record<string, any[]> = {};
      for (const permission of permissions) {
        const module = permission.code.split('.')[0];
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
