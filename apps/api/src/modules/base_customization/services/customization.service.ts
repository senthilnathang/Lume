import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import {
  customFields,
  customViews,
  formLayouts,
  listConfigs,
  dashboardWidgets,
} from '../models/schema';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CreateCustomViewDto,
  UpdateCustomViewDto,
  CreateFormLayoutDto,
  UpdateFormLayoutDto,
  CreateListConfigDto,
  UpdateListConfigDto,
  CreateDashboardWidgetDto,
  UpdateDashboardWidgetDto,
} from '../dtos';
import { eq } from 'drizzle-orm';

@Injectable()
export class CustomizationService {
  private db: any;

  constructor(private drizzle: DrizzleService) {
    this.db = drizzle.getDrizzle();
  }

  // ── Custom Fields ─────────────────────────────────────────────

  async getCustomFields(filters?: { status?: string; model?: string }) {
    let query = this.db.select().from(customFields);

    if (filters?.status) {
      query = query.where(eq(customFields.status, filters.status));
    }
    if (filters?.model) {
      query = query.where(eq(customFields.model, filters.model));
    }

    const results = await query;
    return { success: true, data: results };
  }

  async getFieldsByModel(model: string) {
    const results = await this.db
      .select()
      .from(customFields)
      .where(eq(customFields.model, model));

    return { success: true, data: results };
  }

  async getCustomField(id: number) {
    const result = await this.db
      .select()
      .from(customFields)
      .where(eq(customFields.id, id));

    if (!result.length) {
      return { success: false, error: 'Custom field not found' };
    }

    return { success: true, data: result[0] };
  }

  async createCustomField(dto: CreateCustomFieldDto) {
    try {
      const result = await this.db.insert(customFields).values(dto);
      return { success: true, data: { id: result.insertId, ...dto } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateCustomField(id: number, dto: UpdateCustomFieldDto) {
    try {
      await this.db
        .update(customFields)
        .set(dto)
        .where(eq(customFields.id, id));

      const result = await this.db
        .select()
        .from(customFields)
        .where(eq(customFields.id, id));

      if (!result.length) {
        return { success: false, error: 'Custom field not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteCustomField(id: number) {
    try {
      const result = await this.db
        .select()
        .from(customFields)
        .where(eq(customFields.id, id));

      if (!result.length) {
        return { success: false, error: 'Custom field not found' };
      }

      await this.db.delete(customFields).where(eq(customFields.id, id));

      return { success: true, message: 'Custom field deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Custom Views ──────────────────────────────────────────────

  async getCustomViews(filters?: {
    status?: string;
    model?: string;
    viewType?: string;
  }) {
    let query = this.db.select().from(customViews);

    if (filters?.status) {
      query = query.where(eq(customViews.status, filters.status));
    }
    if (filters?.model) {
      query = query.where(eq(customViews.model, filters.model));
    }
    if (filters?.viewType) {
      query = query.where(eq(customViews.viewType, filters.viewType));
    }

    const results = await query;
    return { success: true, data: results };
  }

  async getCustomView(id: number) {
    const result = await this.db
      .select()
      .from(customViews)
      .where(eq(customViews.id, id));

    if (!result.length) {
      return { success: false, error: 'Custom view not found' };
    }

    return { success: true, data: result[0] };
  }

  async createCustomView(dto: CreateCustomViewDto) {
    try {
      const result = await this.db.insert(customViews).values(dto);
      return { success: true, data: { id: result.insertId, ...dto } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateCustomView(id: number, dto: UpdateCustomViewDto) {
    try {
      await this.db
        .update(customViews)
        .set(dto)
        .where(eq(customViews.id, id));

      const result = await this.db
        .select()
        .from(customViews)
        .where(eq(customViews.id, id));

      if (!result.length) {
        return { success: false, error: 'Custom view not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteCustomView(id: number) {
    try {
      const result = await this.db
        .select()
        .from(customViews)
        .where(eq(customViews.id, id));

      if (!result.length) {
        return { success: false, error: 'Custom view not found' };
      }

      await this.db.delete(customViews).where(eq(customViews.id, id));

      return { success: true, message: 'Custom view deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Form Layouts ──────────────────────────────────────────────

  async getFormLayouts(filters?: { status?: string; model?: string }) {
    let query = this.db.select().from(formLayouts);

    if (filters?.status) {
      query = query.where(eq(formLayouts.status, filters.status));
    }
    if (filters?.model) {
      query = query.where(eq(formLayouts.model, filters.model));
    }

    const results = await query;
    return { success: true, data: results };
  }

  async getFormLayout(id: number) {
    const result = await this.db
      .select()
      .from(formLayouts)
      .where(eq(formLayouts.id, id));

    if (!result.length) {
      return { success: false, error: 'Form layout not found' };
    }

    return { success: true, data: result[0] };
  }

  async createFormLayout(dto: CreateFormLayoutDto) {
    try {
      const result = await this.db.insert(formLayouts).values(dto);
      return { success: true, data: { id: result.insertId, ...dto } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateFormLayout(id: number, dto: UpdateFormLayoutDto) {
    try {
      await this.db
        .update(formLayouts)
        .set(dto)
        .where(eq(formLayouts.id, id));

      const result = await this.db
        .select()
        .from(formLayouts)
        .where(eq(formLayouts.id, id));

      if (!result.length) {
        return { success: false, error: 'Form layout not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteFormLayout(id: number) {
    try {
      const result = await this.db
        .select()
        .from(formLayouts)
        .where(eq(formLayouts.id, id));

      if (!result.length) {
        return { success: false, error: 'Form layout not found' };
      }

      await this.db.delete(formLayouts).where(eq(formLayouts.id, id));

      return { success: true, message: 'Form layout deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── List Configurations ───────────────────────────────────────

  async getListConfigs(filters?: { status?: string; model?: string }) {
    let query = this.db.select().from(listConfigs);

    if (filters?.status) {
      query = query.where(eq(listConfigs.status, filters.status));
    }
    if (filters?.model) {
      query = query.where(eq(listConfigs.model, filters.model));
    }

    const results = await query;
    return { success: true, data: results };
  }

  async getListConfig(id: number) {
    const result = await this.db
      .select()
      .from(listConfigs)
      .where(eq(listConfigs.id, id));

    if (!result.length) {
      return { success: false, error: 'List config not found' };
    }

    return { success: true, data: result[0] };
  }

  async createListConfig(dto: CreateListConfigDto) {
    try {
      const result = await this.db.insert(listConfigs).values(dto);
      return { success: true, data: { id: result.insertId, ...dto } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateListConfig(id: number, dto: UpdateListConfigDto) {
    try {
      await this.db
        .update(listConfigs)
        .set(dto)
        .where(eq(listConfigs.id, id));

      const result = await this.db
        .select()
        .from(listConfigs)
        .where(eq(listConfigs.id, id));

      if (!result.length) {
        return { success: false, error: 'List config not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteListConfig(id: number) {
    try {
      const result = await this.db
        .select()
        .from(listConfigs)
        .where(eq(listConfigs.id, id));

      if (!result.length) {
        return { success: false, error: 'List config not found' };
      }

      await this.db.delete(listConfigs).where(eq(listConfigs.id, id));

      return { success: true, message: 'List config deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Dashboard Widgets ─────────────────────────────────────────

  async getDashboardWidgets(filters?: { status?: string }) {
    let query = this.db.select().from(dashboardWidgets);

    if (filters?.status) {
      query = query.where(eq(dashboardWidgets.status, filters.status));
    }

    const results = await query;
    return { success: true, data: results };
  }

  async getDashboardWidget(id: number) {
    const result = await this.db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.id, id));

    if (!result.length) {
      return { success: false, error: 'Widget not found' };
    }

    return { success: true, data: result[0] };
  }

  async createDashboardWidget(dto: CreateDashboardWidgetDto) {
    try {
      const result = await this.db.insert(dashboardWidgets).values(dto);
      return { success: true, data: { id: result.insertId, ...dto } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateDashboardWidget(id: number, dto: UpdateDashboardWidgetDto) {
    try {
      await this.db
        .update(dashboardWidgets)
        .set(dto)
        .where(eq(dashboardWidgets.id, id));

      const result = await this.db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, id));

      if (!result.length) {
        return { success: false, error: 'Widget not found' };
      }

      return { success: true, data: result[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteDashboardWidget(id: number) {
    try {
      const result = await this.db
        .select()
        .from(dashboardWidgets)
        .where(eq(dashboardWidgets.id, id));

      if (!result.length) {
        return { success: false, error: 'Widget not found' };
      }

      await this.db.delete(dashboardWidgets).where(eq(dashboardWidgets.id, id));

      return { success: true, message: 'Widget deleted' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
