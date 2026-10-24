import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

@Injectable()
export class FieldPermissionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all readable field names for a given role
   */
  async getReadableFields(entityId: number, roleId: number): Promise<string[]> {
    const fields = await this.prisma.entityField.findMany({
      where: { entityId, deletedAt: null },
    });

    const readableFields: string[] = [];

    for (const field of fields) {
      const permission = await this.prisma.entityFieldPermission.findFirst({
        where: {
          fieldId: field.id,
          roleId,
        },
      });

      // If no explicit permission, default is readable
      if (!permission || permission.canRead !== false) {
        readableFields.push(field.name);
      }
    }

    return readableFields;
  }

  /**
   * Get all writable field names for a given role
   */
  async getWritableFields(entityId: number, roleId: number): Promise<string[]> {
    const fields = await this.prisma.entityField.findMany({
      where: { entityId, deletedAt: null },
    });

    const writableFields: string[] = [];

    for (const field of fields) {
      const permission = await this.prisma.entityFieldPermission.findFirst({
        where: {
          fieldId: field.id,
          roleId,
        },
      });

      // If no explicit permission, default is writable
      if (!permission || permission.canWrite !== false) {
        writableFields.push(field.name);
      }
    }

    return writableFields;
  }

  /**
   * Filter record data to only include readable fields
   * Apply masking if field is marked as masked
   */
  async filterRecordForRole(
    entityId: number,
    recordData: Record<string, any>,
    roleId: number,
  ): Promise<Record<string, any>> {
    const fields = await this.prisma.entityField.findMany({
      where: { entityId, deletedAt: null },
    });

    const filteredData: Record<string, any> = { ...recordData };
    const fieldMap: Record<number, any> = {};
    fields.forEach((f) => {
      fieldMap[f.id] = f;
    });

    for (const field of fields) {
      const permission = await this.prisma.entityFieldPermission.findFirst({
        where: {
          fieldId: field.id,
          roleId,
        },
      });

      if (permission && permission.canRead === false) {
        // Remove field from response if not readable
        delete filteredData[field.name];
      } else if (permission && permission.isMasked) {
        // Mask the field value
        const value = filteredData[field.name];
        if (value !== undefined && value !== null) {
          const maskChar = permission.maskChar || '*';
          filteredData[field.name] = String(value)
            .split('')
            .map(() => maskChar)
            .join('');
        }
      }
    }

    return filteredData;
  }

  /**
   * Set field permission for a role
   */
  async setFieldPermission(
    fieldId: number,
    roleId: number,
    canRead: boolean,
    canWrite: boolean,
    isMasked?: boolean,
    maskChar?: string,
  ): Promise<any> {
    this.validateIds(fieldId, roleId);
    if (typeof canRead !== 'boolean' || typeof canWrite !== 'boolean' ||
        (isMasked !== undefined && typeof isMasked !== 'boolean')) {
      throw new BadRequestException('Permission flags must be booleans');
    }
    if (maskChar !== undefined && (typeof maskChar !== 'string' ||
        Array.from(maskChar).length < 1 || Array.from(maskChar).length > 5)) {
      throw new BadRequestException('Mask character must contain between 1 and 5 characters');
    }
    const permission = await this.prisma.$transaction(async tx => {
      const field = await tx.entityField.findFirst({
        where: { id: fieldId, deletedAt: null, entity: { deletedAt: null } },
        select: { id: true },
      });
      if (!field) throw new NotFoundException('Active field not found');
      const role = await tx.role.findUnique({ where: { id: roleId }, select: { id: true } });
      if (!role) throw new NotFoundException('Role not found');
      return tx.entityFieldPermission.upsert({
        where: { fieldId_roleId: { fieldId, roleId } },
        create: { fieldId, roleId, canRead, canWrite, isMasked: isMasked ?? false, maskChar: maskChar ?? '*' },
        update: { canRead, canWrite, isMasked, maskChar },
      });
    });

    return {
      success: true,
      data: permission,
      message: 'Field permission updated successfully',
    };
  }

  private validateIds(fieldId: number, roleId: number) {
    if (![fieldId, roleId].every(id => Number.isSafeInteger(id) && id > 0)) {
      throw new BadRequestException('Field and role IDs must be positive integers');
    }
  }

  async getFieldPermission(fieldId: number, roleId: number) {
    this.validateIds(fieldId, roleId);
    return this.prisma.entityFieldPermission.findFirst({
      where: { fieldId, roleId, field: { deletedAt: null, entity: { deletedAt: null } } },
    });
  }

  async removeFieldPermission(fieldId: number, roleId: number): Promise<boolean> {
    this.validateIds(fieldId, roleId);
    const result = await this.prisma.entityFieldPermission.deleteMany({ where: { fieldId, roleId } });
    return result.count > 0;
  }

  /**
   * Get field permissions for a field
   */
  async getFieldPermissions(fieldId: number): Promise<any> {
    const permissions = await this.prisma.entityFieldPermission.findMany({
      where: { fieldId },
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      success: true,
      data: permissions,
    };
  }
}
