import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { DrizzleService } from '@core/services/drizzle.service';
import { CreateEntityDto, UpdateEntityDto, CreateFieldDto, UpdateFieldDto, CreateViewDto } from '../dtos';

@Injectable()
export class EntityService {
  constructor(
    private prisma: PrismaService,
    private drizzle: DrizzleService,
  ) {}

  /**
   * Create a new custom entity
   */
  async createEntity(dto: CreateEntityDto): Promise<any> {
    // Check if entity name already exists
    const existing = await this.prisma.entity.findFirst({
      where: { name: dto.name },
    });

    if (existing) {
      throw new Error(`Entity with name "${dto.name}" already exists`);
    }

    return this.prisma.entity.create({
      data: {
        name: dto.name,
        label: dto.label,
        description: dto.description || null,
      },
    });
  }

  /**
   * Get entity by ID with all fields
   */
  async getEntity(id: number): Promise<any> {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new Error('Entity not found');
    }

    const fields = await this.prisma.entityField.findMany({
      where: { entityId: id, deletedAt: null },
      orderBy: { sequence: 'asc' },
    });

    const parsedFields = fields.map((f) => ({
      ...f,
      selectOptions: f.selectOptions ? JSON.parse(f.selectOptions) : null,
    }));

    return {
      ...entity,
      fields: parsedFields,
    };
  }

  /**
   * List all entities with pagination
   */
  async listEntities(options: { page?: number; limit?: number } = {}): Promise<any> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.entity.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.entity.count(),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update entity metadata
   */
  async updateEntity(id: number, dto: UpdateEntityDto): Promise<any> {
    const entity = await this.prisma.entity.findUnique({ where: { id } });

    if (!entity) {
      throw new Error('Entity not found');
    }

    return this.prisma.entity.update({
      where: { id },
      data: {
        ...(dto.label && { label: dto.label }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  /**
   * Delete entity (soft delete by setting deletedAt)
   */
  async deleteEntity(id: number): Promise<any> {
    const entity = await this.prisma.entity.findUnique({ where: { id } });

    if (!entity) {
      throw new Error('Entity not found');
    }

    return this.prisma.entity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Publish entity
   */
  async publishEntity(id: number): Promise<any> {
    const entity = await this.prisma.entity.findUnique({ where: { id } });

    if (!entity) {
      throw new Error('Entity not found');
    }

    if (!entity.isPublishable) {
      const error = new Error('Entity is not publishable');
      (error as any).code = 'NOT_PUBLISHABLE';
      throw error;
    }

    return this.prisma.entity.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });
  }

  /**
   * Unpublish entity
   */
  async unpublishEntity(id: number): Promise<any> {
    const entity = await this.prisma.entity.findUnique({ where: { id } });

    if (!entity) {
      throw new Error('Entity not found');
    }

    return this.prisma.entity.update({
      where: { id },
      data: { isPublished: false },
    });
  }

  /**
   * Create a field for an entity
   */
  async createField(entityId: number, dto: CreateFieldDto): Promise<any> {
    const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });

    if (!entity) {
      throw new Error('Entity not found');
    }

    const existing = await this.prisma.entityField.findFirst({
      where: {
        entityId,
        name: dto.name,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new Error(`Field with name "${dto.name}" already exists in this entity`);
    }

    const field = await this.prisma.entityField.create({
      data: {
        entityId,
        name: dto.name,
        label: dto.label,
        type: dto.type,
        required: dto.required || false,
        selectOptions: dto.selectOptions ? JSON.stringify(dto.selectOptions) : null,
        helpText: dto.helpText || null,
        defaultValue: dto.defaultValue || null,
        sequence: 0,
        slug: dto.name.toLowerCase().replace(/\s+/g, '_'),
      },
    });

    return {
      ...field,
      selectOptions: field.selectOptions ? JSON.parse(field.selectOptions) : null,
    };
  }

  /**
   * Get fields for an entity
   */
  async getFieldsByEntity(entityId: number): Promise<any[]> {
    const fields = await this.prisma.entityField.findMany({
      where: {
        entityId,
        deletedAt: null,
      },
      orderBy: { sequence: 'asc' },
    });

    return fields.map((f) => ({
      ...f,
      selectOptions: f.selectOptions ? JSON.parse(f.selectOptions) : null,
    }));
  }

  /**
   * Update a field
   */
  async updateField(fieldId: number, dto: UpdateFieldDto): Promise<any> {
    const field = await this.prisma.entityField.findUnique({ where: { id: fieldId } });

    if (!field) {
      throw new Error('Field not found');
    }

    const safeUpdates: any = {};

    if (dto.label !== undefined) {
      safeUpdates.label = dto.label;
    }

    if (dto.required !== undefined) {
      safeUpdates.required = dto.required;
    }

    if (dto.helpText !== undefined) {
      safeUpdates.helpText = dto.helpText;
    }

    if (dto.selectOptions !== undefined) {
      safeUpdates.selectOptions = JSON.stringify(dto.selectOptions);
    }

    if (dto.defaultValue !== undefined) {
      safeUpdates.defaultValue = dto.defaultValue;
    }

    const updated = await this.prisma.entityField.update({
      where: { id: fieldId },
      data: safeUpdates,
    });

    return {
      ...updated,
      selectOptions: updated.selectOptions ? JSON.parse(updated.selectOptions) : null,
    };
  }

  /**
   * Delete a field (soft delete)
   */
  async deleteField(fieldId: number): Promise<any> {
    const field = await this.prisma.entityField.findUnique({ where: { id: fieldId } });

    if (!field) {
      throw new Error('Field not found');
    }

    return this.prisma.entityField.update({
      where: { id: fieldId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Create a view for an entity
   */
  async createView(entityId: number, dto: CreateViewDto): Promise<any> {
    const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });

    if (!entity) {
      throw new Error('Entity not found');
    }

    const existing = await this.prisma.entityView.findFirst({
      where: {
        entityId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new Error(`View with name "${dto.name}" already exists in this entity`);
    }

    const view = await this.prisma.entityView.create({
      data: {
        entityId,
        name: dto.name,
        type: dto.type,
        config: dto.config ? JSON.stringify(dto.config) : JSON.stringify({}),
        isDefault: false,
      },
    });

    return {
      ...view,
      config: view.config ? JSON.parse(view.config) : {},
    };
  }

  /**
   * Get views for an entity
   */
  async getViewsByEntity(entityId: number): Promise<any[]> {
    const views = await this.prisma.entityView.findMany({
      where: { entityId },
      orderBy: { createdAt: 'asc' },
    });

    return views.map((v) => ({
      ...v,
      config: v.config ? JSON.parse(v.config) : {},
    }));
  }
}
