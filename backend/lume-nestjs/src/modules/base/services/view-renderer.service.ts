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

    let viewData: any = {
      id: view.id,
      name: view.name,
      type: view.type,
      isDefault: view.isDefault,
      pageSize: config.pageSize || 20,
      defaultSort: config.defaultSort || [{ field: 'createdAt', direction: 'desc' }],
      filters: config.filters || [],
    };

    if (view.type === 'list') {
      const columnNames = config.columns || fields.map((f) => f.name).slice(0, 5);
      viewData.columns = columnNames
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
      viewData.columns = fields.map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type,
      }));
    } else if (view.type === 'form') {
      viewData.columns = fields.map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type,
        required: f.required,
        helpText: f.helpText,
      }));
    } else if (view.type === 'kanban') {
      viewData.groupByField = config.groupByField;
      viewData.cardFields = config.cardFields || [];
      viewData.swimlaneField = config.swimlaneField || null;
      viewData.colorByField = config.colorByField || null;
      viewData.columns = this.extractKanbanColumns(fieldMap, config.groupByField);
    } else if (view.type === 'calendar') {
      viewData.startDateField = config.startDateField;
      viewData.endDateField = config.endDateField;
      viewData.titleField = config.titleField;
      viewData.colorField = config.colorField || null;
    }

    return {
      success: true,
      data: viewData,
    };
  }

  /**
   * Extract kanban columns from the groupByField
   */
  private extractKanbanColumns(fieldMap: Record<string, any>, groupByField: string): any[] {
    const field = fieldMap[groupByField];
    if (!field) return [];

    if (field.type === 'select' && field.selectOptions) {
      return field.selectOptions.map((option: string) => ({
        value: option,
        label: option,
        color: null,
      }));
    }

    return [];
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
