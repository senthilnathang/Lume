import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { BaseRbacService } from '../services/base-rbac.service';
import { PrismaService } from '@core/services/prisma.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionDto,
  UpdatePermissionDto,
  AssignPermissionDto,
} from '../dtos';
import { Public, Permissions } from '@core/decorators';

/**
 * BaseRbacController
 * Provides endpoints for RBAC permission checking primitives
 * Exposes role, permission, and permission assignment operations
 */
@Controller('api/base-rbac')
export class BaseRbacController {
  constructor(
    private baseRbacService: BaseRbacService,
    private prisma: PrismaService,
  ) {}

  // ============ ROLES ============

  /**
   * Get all roles
   */
  @Get('roles')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.roles.read')
  async getAllRoles() {
    const roles = await this.baseRbacService.getAllRoles();
    return { success: true, data: roles };
  }

  /**
   * Get role by ID with permissions
   */
  @Get('roles/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.roles.read')
  async getRoleById(@Param('id', ParseIntPipe) id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      return { success: false, error: 'Role not found' };
    }

    return { success: true, data: role };
  }

  /**
   * Create a new role
   */
  @Post('roles')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.roles.write')
  async createRole(@Body() dto: CreateRoleDto) {
    try {
      const role = await this.prisma.role.create({
        data: {
          name: dto.name,
          description: dto.description,
          is_active: dto.is_active !== false,
        },
      });

      return {
        success: true,
        data: role,
        message: 'Role created successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create role',
      };
    }
  }

  /**
   * Update a role
   */
  @Put('roles/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.roles.write')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    try {
      const role = await this.prisma.role.findUnique({ where: { id } });

      if (!role) {
        return { success: false, error: 'Role not found' };
      }

      const updated = await this.prisma.role.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });

      return {
        success: true,
        data: updated,
        message: 'Role updated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update role',
      };
    }
  }

  /**
   * Delete a role
   */
  @Delete('roles/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.roles.write')
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    try {
      const role = await this.prisma.role.findUnique({ where: { id } });

      if (!role) {
        return { success: false, error: 'Role not found' };
      }

      // Prevent deleting system roles
      if (['admin', 'super_admin'].includes(role.name)) {
        return { success: false, error: 'Cannot delete system role' };
      }

      // Check if role is assigned to users
      const userCount = await this.prisma.user.count({
        where: { role_id: id },
      });

      if (userCount > 0) {
        return {
          success: false,
          error: `Cannot delete role with ${userCount} assigned users`,
        };
      }

      // Delete role permissions first
      await this.prisma.rolePermission.deleteMany({
        where: { role_id: id },
      });

      // Delete role
      await this.prisma.role.delete({ where: { id } });

      return { success: true, message: 'Role deleted successfully' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete role',
      };
    }
  }

  // ============ PERMISSIONS ============

  /**
   * Get all permissions
   */
  @Get('permissions')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.permissions.read')
  async getAllPermissions() {
    const permissions = await this.baseRbacService.getAllPermissions();
    return { success: true, data: permissions };
  }

  /**
   * Get permissions grouped by module
   */
  @Get('permissions/grouped')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.permissions.read')
  async getPermissionsGrouped() {
    const grouped = await this.baseRbacService.getPermissionsGrouped();
    return { success: true, data: grouped };
  }

  /**
   * Create a new permission
   */
  @Post('permissions')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.permissions.write')
  async createPermission(@Body() dto: CreatePermissionDto) {
    try {
      const permission = await this.prisma.permission.create({
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          group: dto.group || 'General',
          is_active: dto.is_active !== false,
        },
      });

      return {
        success: true,
        data: permission,
        message: 'Permission created successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create permission',
      };
    }
  }

  /**
   * Update a permission
   */
  @Put('permissions/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.permissions.write')
  async updatePermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionDto,
  ) {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id },
      });

      if (!permission) {
        return { success: false, error: 'Permission not found' };
      }

      const updated = await this.prisma.permission.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.code && { code: dto.code }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.group && { group: dto.group }),
          ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        },
      });

      return {
        success: true,
        data: updated,
        message: 'Permission updated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update permission',
      };
    }
  }

  /**
   * Delete a permission
   */
  @Delete('permissions/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.permissions.write')
  async deletePermission(@Param('id', ParseIntPipe) id: number) {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id },
      });

      if (!permission) {
        return { success: false, error: 'Permission not found' };
      }

      // Check if permission is assigned to any roles
      const roleCount = await this.prisma.rolePermission.count({
        where: { permission_id: id },
      });

      if (roleCount > 0) {
        return {
          success: false,
          error: `Cannot delete permission assigned to ${roleCount} roles`,
        };
      }

      await this.prisma.permission.delete({ where: { id } });

      return { success: true, message: 'Permission deleted successfully' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete permission',
      };
    }
  }

  // ============ ROLE-PERMISSION ASSIGNMENTS ============

  /**
   * Assign permissions to a role
   */
  @Post('roles/:id/permissions')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.roles.write')
  async assignPermissionsToRole(
    @Param('id', ParseIntPipe) roleId: number,
    @Body() dto: AssignPermissionDto,
  ) {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        return { success: false, error: 'Role not found' };
      }

      // Remove existing permissions
      await this.prisma.rolePermission.deleteMany({
        where: { role_id: roleId },
      });

      // Add new permissions
      if (dto.permissionIds && dto.permissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
          })),
          skipDuplicates: true,
        });
      }

      const updated = await this.prisma.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });

      return {
        success: true,
        data: updated,
        message: 'Permissions assigned successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to assign permissions',
      };
    }
  }

  /**
   * Get permissions for a role
   */
  @Get('roles/:id/permissions')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('base.roles.read')
  async getRolePermissions(@Param('id', ParseIntPipe) roleId: number) {
    try {
      const permissions = await this.baseRbacService.getRolePermissions(roleId);
      return { success: true, data: permissions };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch role permissions',
      };
    }
  }

  // ============ USER PERMISSIONS ============

  /**
   * Check if user has permission
   */
  @Post('check-permission')
  @UseGuards(JwtAuthGuard)
  async checkPermission(
    @Body('userId', ParseIntPipe) userId: number,
    @Body('permission') permission: string,
  ) {
    try {
      const has = await this.baseRbacService.hasPermission(userId, permission);
      return { success: true, data: { has, permission } };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check permission',
      };
    }
  }

  /**
   * Get current user permissions
   */
  @Get('me/permissions')
  @UseGuards(JwtAuthGuard)
  async getCurrentUserPermissions() {
    // This would be implemented with a CurrentUser decorator
    // For now, return a placeholder
    return {
      success: false,
      error: 'CurrentUser decorator not implemented',
    };
  }
}
