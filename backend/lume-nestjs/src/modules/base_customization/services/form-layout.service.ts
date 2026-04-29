import { Injectable, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { PrismaService } from '@core/services/prisma.service';
import { formLayouts, formLayoutRevisions } from '../models/schema';
import { CreateFormLayoutDto, UpdateFormLayoutDto, FormLayoutSchemaDto } from '../dtos/form-layout.dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class FormLayoutService {
  private db: any;

  constructor(
    private drizzle: DrizzleService,
    private prisma: PrismaService,
  ) {
    this.db = drizzle.getDrizzle();
  }

  async createFormLayout(dto: CreateFormLayoutDto, userId: number) {
    // Validate form layout schema
    const validation = await this.validateFormLayout(dto.schema, dto.entityId);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid form layout',
        errors: validation.errors,
      });
    }

    try {
      // Create form layout
      const result = await this.db.insert(formLayouts).values({
        name: dto.name || 'Default Layout',
        model: `entity_${dto.entityId}`,
        layout: JSON.stringify(dto.schema),
        isDefault: false,
        status: 'active',
      });

      const layoutId = result.insertId;

      // Create initial revision
      await this.db.insert(formLayoutRevisions).values({
        layoutId,
        layoutSnapshot: JSON.stringify(dto.schema),
        changedBy: userId,
        changeNote: 'Initial layout created',
        revisionNumber: 1,
      });

      return { success: true, data: { id: layoutId, ...dto } };
    } catch (error: any) {
      throw new BadRequestException({
        message: 'Failed to create form layout',
        error: error.message,
      });
    }
  }

  async updateFormLayout(layoutId: number, dto: UpdateFormLayoutDto, userId: number) {
    try {
      // Get existing layout
      const layouts = await this.db.select().from(formLayouts).where(eq(formLayouts.id, layoutId));

      if (!layouts.length) {
        throw new BadRequestException('Form layout not found');
      }

      const layout = layouts[0];

      // Validate new schema if provided
      if (dto.schema) {
        // Extract entityId from model name (format: entity_123)
        const entityId = parseInt(layout.model.replace('entity_', ''));
        const validation = await this.validateFormLayout(dto.schema, entityId);

        if (!validation.valid) {
          throw new BadRequestException({
            message: 'Invalid form layout',
            errors: validation.errors,
          });
        }
      }

      // Update layout
      const updateData: any = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.schema) updateData.layout = JSON.stringify(dto.schema);

      await this.db.update(formLayouts).set(updateData).where(eq(formLayouts.id, layoutId));

      // Create revision if schema changed
      if (dto.schema) {
        const revisions = await this.db
          .select()
          .from(formLayoutRevisions)
          .where(eq(formLayoutRevisions.layoutId, layoutId));

        const nextRevision = (revisions.length || 0) + 1;

        await this.db.insert(formLayoutRevisions).values({
          layoutId,
          layoutSnapshot: JSON.stringify(dto.schema),
          changedBy: userId,
          changeNote: dto.schema ? 'Layout updated' : 'Name updated',
          revisionNumber: nextRevision,
        });
      }

      return { success: true, message: 'Form layout updated' };
    } catch (error: any) {
      throw new BadRequestException({
        message: 'Failed to update form layout',
        error: error.message,
      });
    }
  }

  async getFormLayout(layoutId: number) {
    try {
      const layouts = await this.db.select().from(formLayouts).where(eq(formLayouts.id, layoutId));

      if (!layouts.length) {
        return null;
      }

      const layout = layouts[0];
      return {
        ...layout,
        layout: JSON.parse(layout.layout || '{}'),
      };
    } catch (error: any) {
      console.error(`Failed to get form layout: ${error.message}`);
      return null;
    }
  }

  async getLayoutRevisions(layoutId: number, limit = 10) {
    try {
      const revisions = await this.db
        .select()
        .from(formLayoutRevisions)
        .where(eq(formLayoutRevisions.layoutId, layoutId))
        .limit(limit);

      return {
        success: true,
        data: revisions.map((r: any) => ({
          ...r,
          layoutSnapshot: JSON.parse(r.layoutSnapshot || '{}'),
        })),
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async restoreRevision(layoutId: number, revisionId: number, userId: number) {
    try {
      // Get revision to restore
      const revisions = await this.db
        .select()
        .from(formLayoutRevisions)
        .where(eq(formLayoutRevisions.id, revisionId));

      if (!revisions.length) {
        throw new BadRequestException('Revision not found');
      }

      const revision = revisions[0];
      const schema = JSON.parse(revision.layoutSnapshot);

      // Update layout
      await this.db.update(formLayouts).set({ layout: JSON.stringify(schema) }).where(eq(formLayouts.id, layoutId));

      // Create new revision
      const allRevisions = await this.db
        .select()
        .from(formLayoutRevisions)
        .where(eq(formLayoutRevisions.layoutId, layoutId));

      const nextRevision = (allRevisions.length || 0) + 1;

      await this.db.insert(formLayoutRevisions).values({
        layoutId,
        layoutSnapshot: revision.layoutSnapshot,
        changedBy: userId,
        changeNote: `Restored from revision ${revision.revisionNumber}`,
        revisionNumber: nextRevision,
      });

      return { success: true, message: 'Revision restored' };
    } catch (error: any) {
      throw new BadRequestException({
        message: 'Failed to restore revision',
        error: error.message,
      });
    }
  }

  private async validateFormLayout(
    schema: FormLayoutSchemaDto,
    entityId: number,
  ): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    try {
      // Get entity fields to validate field names
      const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });

      if (!entity) {
        return { valid: false, errors: ['Entity not found'] };
      }

      const fields = await this.prisma.entityField.findMany({
        where: { entityId, deletedAt: null },
      });

      const validFieldNames = fields.map((f: any) => f.name);

      // Validate all field references in layout
      if (schema.sections) {
        for (const section of schema.sections) {
          if (!section.id) {
            errors.push('Section must have an id');
          }

          if (section.columns && (section.columns < 1 || section.columns > 4)) {
            errors.push(`Section columns must be between 1 and 4, got ${section.columns}`);
          }

          if (section.rows) {
            for (const row of section.rows) {
              if (row.fields) {
                for (const field of row.fields) {
                  if (!validFieldNames.includes(field.fieldName)) {
                    errors.push(`Field '${field.fieldName}' does not exist in entity`);
                  }

                  if (field.colspan && (field.colspan < 1 || field.colspan > 4)) {
                    errors.push(`Field colspan must be between 1 and 4, got ${field.colspan}`);
                  }
                }
              }
            }
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
      };
    }
  }
}
