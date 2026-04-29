import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { CreateRoleDto, UpdateRoleDto, CreatePermissionDto, CreateAccessRuleDto, UpdateAccessRuleDto } from '../dtos';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  // ============ Roles ============

  async getAllRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: roles,
    };
  }

  async getRoleById(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      success: true,
      data: role,
    };
  }

  async createRole(dto: CreateRoleDto) {
    // Check if role name already exists
    const existingRole = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existingRole) {
      throw new BadRequestException('Role with this name already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        display_name: dto.name,
        description: dto.description || '',
        is_system: false,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return {
      success: true,
      data: role,
    };
  }

  async updateRole(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new ForbiddenException('Cannot modify system role');
    }

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name, display_name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updatedRole,
    };
  }

  async deleteRole(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.is_system) {
      throw new ForbiddenException('Cannot delete system role');
    }

    await this.prisma.role.delete({ where: { id } });

    return {
      success: true,
      message: 'Role deleted',
    };
  }

  // ============ Permissions ============

  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return {
      success: true,
      data: permissions,
    };
  }

  async getPermissionsGrouped() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const grouped: Record<string, any[]> = {};
    for (const permission of permissions) {
      const category = permission.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(permission);
    }

    return {
      success: true,
      data: grouped,
    };
  }

  async createPermission(dto: CreatePermissionDto) {
    // Check if permission code already exists
    const existingPermission = await this.prisma.permission.findUnique({
      where: { name: dto.code },
    });

    if (existingPermission) {
      throw new BadRequestException('Permission with this code already exists');
    }

    const permission = await this.prisma.permission.create({
      data: {
        name: dto.code,
        display_name: dto.name,
        description: dto.description || '',
        category: dto.category || 'general',
      },
    });

    return {
      success: true,
      data: permission,
    };
  }

  // ============ Access Rules (RecordRules) ============

  async getAllRules() {
    const rules = await this.prisma.recordRule.findMany({
      orderBy: { sequence: 'asc' },
    });

    return {
      success: true,
      data: rules,
    };
  }

  async createRule(dto: CreateAccessRuleDto) {
    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const rule = await this.prisma.recordRule.create({
      data: {
        name: dto.name,
        modelName: dto.model,
        action: dto.permission as any,
        domain: JSON.stringify(dto.filter || {}),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        sequence: dto.priority || 10,
      },
    });

    return {
      success: true,
      data: rule,
    };
  }

  async updateRule(id: number, dto: UpdateAccessRuleDto) {
    const rule = await this.prisma.recordRule.findUnique({ where: { id } });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    const updatedRule = await this.prisma.recordRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.model !== undefined && { modelName: dto.model }),
        ...(dto.permission !== undefined && { action: dto.permission as any }),
        ...(dto.filter !== undefined && { domain: JSON.stringify(dto.filter || {}) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.priority !== undefined && { sequence: dto.priority }),
      },
    });

    return {
      success: true,
      data: updatedRule,
    };
  }

  async deleteRule(id: number) {
    const rule = await this.prisma.recordRule.findUnique({ where: { id } });

    if (!rule) {
      throw new NotFoundException('Rule not found');
    }

    await this.prisma.recordRule.delete({ where: { id } });

    return {
      success: true,
      message: 'Rule deleted',
    };
  }
}
