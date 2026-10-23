import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { Prisma, Role } from '@prisma/client';

interface RoleChanges { displayName?: string; description?: string; isActive?: boolean; metadata?: string }

@Injectable()
export class RoleManagementService {
  constructor(private readonly prisma: PrismaService) {}

  private validateId(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestException('Role ID must be a positive integer');
  }

  private changes(input: RoleChanges, creating = false) {
    if ((creating || input.displayName !== undefined) &&
        (typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.trim().length > 100)) {
      throw new BadRequestException('Display name must contain 1 to 100 characters');
    }
    if (input.description != null && (typeof input.description !== 'string' || input.description.length > 255)) {
      throw new BadRequestException('Description must not exceed 255 characters');
    }
    if (input.isActive !== undefined && typeof input.isActive !== 'boolean') throw new BadRequestException('isActive must be a boolean');
    return { display_name: input.displayName?.trim(), description: input.description,
      isActive: input.isActive, metadata: input.metadata };
  }

  private protect(role: Role) {
    if (role.is_system || ['admin', 'super_admin'].includes(role.name.toLowerCase())) {
      throw new ForbiddenException('System roles cannot be modified or deleted');
    }
  }

  private audit(tx: Prisma.TransactionClient, event: string, role: Role, actor: number) {
    return tx.security_logs.create({ data: { user_id: actor, event, details: JSON.stringify({ roleId: role.id, name: role.name }) } });
  }

  async get(id: number) {
    this.validateId(id);
    return this.prisma.role.findUnique({ where: { id } });
  }

  async create(input: RoleChanges & { name: string }, actor: number) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 50) {
      throw new BadRequestException('Role name must contain 1 to 50 characters');
    }
    const name = input.name.trim();
    if (['admin', 'super_admin'].includes(name.toLowerCase())) throw new ForbiddenException('Role name is reserved');
    const data = this.changes(input, true);
    try {
      return await this.prisma.$transaction(async tx => {
        const role = await tx.role.create({ data: { ...data, name, display_name: data.display_name!, is_system: false, isActive: data.isActive ?? true } });
        await this.audit(tx, 'role.created', role, actor);
        return role;
      });
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('Role name already exists');
      throw error;
    }
  }

  async update(id: number, input: RoleChanges, actor: number) {
    this.validateId(id);
    const data = this.changes(input);
    return this.prisma.$transaction(async tx => {
      const existing = await tx.role.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Role not found');
      this.protect(existing);
      const role = await tx.role.update({ where: { id }, data });
      await this.audit(tx, 'role.updated', role, actor);
      return role;
    });
  }

  async delete(id: number, actor: number) {
    this.validateId(id);
    try {
      return await this.prisma.$transaction(async tx => {
        const role = await tx.role.findUnique({ where: { id } });
        if (!role) throw new NotFoundException('Role not found');
        this.protect(role);
        if (await tx.user.count({ where: { role_id: id } })) throw new ConflictException('Role is assigned to users');
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.entityFieldPermission.deleteMany({ where: { roleId: id } });
        await tx.role.delete({ where: { id } });
        await this.audit(tx, 'role.deleted', role, actor);
        return true;
      });
    } catch (error) {
      if (error.code === 'P2003') throw new ConflictException('Role is still referenced');
      throw error;
    }
  }
}
