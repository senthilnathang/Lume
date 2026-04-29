import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

@Injectable()
export class ViewRendererService {
  constructor(private prisma: PrismaService) {}

  /**
   * Render view with metadata and column configuration
   */
  async renderView(entityId: number, viewId: number): Promise<any> {
    // Get view from database
    const view = await this.prisma.entityView.findUnique({
      where: { id: viewId },
    });

    if (!view || view.entityId !== entityId) {
      throw new Error('View not found');
    }

    // Get entity fields
    const fields = await this.prisma.entityField.findMany({
      where: { entityId, deletedAt: null },
      orderBy: { sequence: 'asc' },
    });

    // Build view metadata based on type
    const config = view.config ? JSON.parse(view.config) : {};
    const fieldMap: Record<string, any> = {};
    fields.forEach((f) => {
      fieldMap[f.name] = f;
    });

    let columns: any[] = [];

    if (view.type === 'list') {
      const columnNames = config.columns || fields.map((f) => f.name).slice(0, 5);
      columns = columnNames
        .map((name: string) => {
          const field = fieldMap[name];
          if (!field) return null;
          return {
            name,
            label: field.label || name,
            type: field.type,
            width: config.columnWidths?.[name] || 150,
            sortable: true,
            filterable: true,
          };
        })
        .filter(Boolean);
    } else if (view.type === 'grid') {
      columns = fields.map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type,
      }));
    } else if (view.type === 'form') {
      columns = fields.map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type,
        required: f.required,
        helpText: f.helpText,
      }));
    }

    return {
      success: true,
      data: {
        id: view.id,
        name: view.name,
        type: view.type,
        isDefault: view.isDefault,
        columns,
        pageSize: config.pageSize || 20,
        defaultSort: config.defaultSort || [{ field: 'createdAt', direction: 'desc' }],
        filters: config.filters || [],
      },
    };
  }

  /**
   * List all views for an entity
   */
  async listViewsByEntity(entityId: number): Promise<any> {
    const views = await this.prisma.entityView.findMany({
      where: { entityId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: views.map((view) => ({
        id: view.id,
        name: view.name,
        type: view.type,
        isDefault: view.isDefault,
        config: view.config ? JSON.parse(view.config) : {},
      })),
    };
  }
}
