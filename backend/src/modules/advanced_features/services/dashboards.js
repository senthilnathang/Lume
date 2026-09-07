import { DrizzleAdapter } from '../../../core/db/adapters/drizzle-adapter.js';
import { dashboards, dashboardCategories } from '../models/schema.js';
import { dashboardWidgets } from '../../base_customization/models/schema.js';

function placementsOf(dashboard) {
  const raw = dashboard?.layoutConfig;
  const config = typeof raw === 'string' ? safeParse(raw) : raw || {};
  const list = Array.isArray(config.widgets) ? config.widgets : [];
  return list.filter((w) => w && w.widgetId !== undefined);
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export class DashboardService {
  constructor(prismaClient = null, overrides = {}) {
    this.dashboards = overrides.dashboards || new DrizzleAdapter(dashboards);
    this.categories = overrides.categories || new DrizzleAdapter(dashboardCategories);
    this.widgets = overrides.widgets || new DrizzleAdapter(dashboardWidgets);
    this.prisma = prismaClient;
    this.reportRunner = overrides.reportRunner || null;
  }

  async resolveWidget(widget, context = {}) {
    const config = typeof widget.config === 'string' ? safeParse(widget.config) : widget.config || {};
    const type = widget.widgetType || widget.widget_type || config.type || 'counter';
    if (type === 'static' || config.staticValue !== undefined) {
      return { type: 'static', value: config.staticValue ?? config.value ?? null };
    }
    if (type === 'report' && (config.reportId || config.report_id)) {
      try {
        const runner = this.reportRunner || (await import('./analytics-reports.js').then((m) => new m.AnalyticsReportService(this.prisma)));
        const result = await runner.run(Number(config.reportId || config.report_id), context);
        return { type: 'report', total: result.total, rows: (result.rows || []).slice(0, 5) };
      } catch (error) {
        return { type: 'report', error: error.message, total: 0, rows: [] };
      }
    }
    const model = widget.model || config.model || config.entity;
    if (!model || !this.prisma) {
      return { type, value: null, error: model ? 'No database context' : 'No model configured' };
    }
    try {
      const entity = await this.prisma.entity.findFirst({ where: { name: String(model) } });
      if (!entity) {
        return { type, value: null, error: `Entity not found: ${model}` };
      }
      const where = { entityId: entity.id, deletedAt: null };
      if (context.companyId !== undefined && context.companyId !== null) {
        where.companyId = context.companyId;
      }
      const value = await this.prisma.entityRecord.count({ where });
      return { type, value };
    } catch (error) {
      return { type, value: null, error: error.message };
    }
  }

  async getDashboardData(id, context = {}) {
    const full = await this.getDashboardWithWidgets(id);
    if (!full) {
      return null;
    }
    const widgets = await Promise.all((full.widgets || []).map(async (w) => ({
      id: w.id,
      name: w.name,
      layout: w.layout || null,
      data: await this.resolveWidget(w, context),
    })));
    return { id: full.id, name: full.name, code: full.code, widgets };
  }

  listCategories() {
    return this.categories.findAll({ limit: 100, offset: 0, order: [['sequence', 'ASC']] });
  }

  createCategory(data) {
    if (!data?.name) {
      const error = new Error('Category name is required');
      error.errors = { name: 'Name is required' };
      throw error;
    }
    return this.categories.create({ name: data.name, icon: data.icon || null, sequence: data.sequence || 0 });
  }

  listDashboards() {
    return this.dashboards.findAll({ limit: 100, offset: 0, order: [['createdAt', 'DESC']] });
  }

  getDashboard(id) {
    return this.dashboards.findById(id);
  }

  createDashboard(data) {
    if (!data?.name || !data?.code) {
      const error = new Error('Dashboard validation failed');
      error.errors = {
        ...(data?.name ? {} : { name: 'Name is required' }),
        ...(data?.code ? {} : { code: 'Code is required' }),
      };
      throw error;
    }
    return this.dashboards.create({
      name: data.name,
      code: data.code,
      description: data.description || null,
      icon: data.icon || null,
      categoryId: data.categoryId || data.category_id || null,
      visibility: data.visibility || 'company',
      refreshInterval: data.refreshInterval || data.refresh_interval || null,
      isDefault: !!data.isDefault,
      isActive: data.isActive !== false,
      layoutConfig: data.layoutConfig || data.layout_config || {},
    });
  }

  async updateDashboard(id, data) {
    const existing = await this.dashboards.findById(id);
    if (!existing) {
      return null;
    }
    return this.dashboards.update(id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.icon !== undefined ? { icon: data.icon } : {}),
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
      ...(data.refreshInterval !== undefined ? { refreshInterval: data.refreshInterval } : {}),
      ...(data.isDefault !== undefined ? { isDefault: !!data.isDefault } : {}),
      ...(data.isActive !== undefined ? { isActive: !!data.isActive } : {}),
      ...(data.layoutConfig !== undefined ? { layoutConfig: data.layoutConfig } : {}),
    });
  }

  async removeDashboard(id) {
    const existing = await this.dashboards.findById(id);
    if (!existing) {
      return false;
    }
    await this.dashboards.destroy(id);
    return true;
  }

  async setDefault(id) {
    const target = await this.dashboards.findById(id);
    if (!target) {
      return null;
    }
    const { rows } = await this.dashboards.findAll({ limit: 1000, offset: 0 });
    await Promise.all((rows || []).filter((d) => d.isDefault).map((d) => this.dashboards.update(d.id, { isDefault: false })));
    return this.dashboards.update(id, { isDefault: true });
  }

  async assignWidgets(id, placements) {
    const dashboard = await this.dashboards.findById(id);
    if (!dashboard) {
      return null;
    }
    const clean = (Array.isArray(placements) ? placements : []).map((p) => ({
      widgetId: Number(p.widgetId),
      x: Number(p.x) || 0,
      y: Number(p.y) || 0,
      w: Number(p.w) || 3,
      h: Number(p.h) || 2,
    })).filter((p) => Number.isInteger(p.widgetId));
    const current = typeof dashboard.layoutConfig === 'string' ? safeParse(dashboard.layoutConfig) : dashboard.layoutConfig || {};
    return this.dashboards.update(id, { layoutConfig: { ...current, widgets: clean } });
  }

  async getDashboardWithWidgets(id) {
    const dashboard = await this.dashboards.findById(id);
    if (!dashboard) {
      return null;
    }
    const placements = placementsOf(dashboard);
    const widgets = await Promise.all(placements.map(async (p) => {
      try {
        const widget = await this.widgets.findById(p.widgetId);
        return widget ? { ...widget, layout: { x: p.x, y: p.y, w: p.w, h: p.h } } : null;
      } catch {
        return null;
      }
    }));
    return { ...dashboard, widgets: widgets.filter(Boolean) };
  }
}

export default DashboardService;
