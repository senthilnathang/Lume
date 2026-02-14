/**
 * Base Customization Services
 */

export class CustomizationService {
  constructor(models, sequelize) {
    this.models = models;
    this.sequelize = sequelize;
  }

  // ── Custom Fields ─────────────────────────────────────────────

  async getCustomFields(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.model) where.model = filters.model;

    return this.models.CustomField.findAll({
      where,
      order: [['model', 'ASC'], ['sequence', 'ASC']]
    });
  }

  async getCustomField(id) {
    return this.models.CustomField.findByPk(id);
  }

  async createCustomField(data) {
    return this.models.CustomField.create(data);
  }

  async updateCustomField(id, data) {
    const field = await this.models.CustomField.findByPk(id);
    if (!field) return null;
    await field.update(data);
    return field;
  }

  async deleteCustomField(id) {
    const field = await this.models.CustomField.findByPk(id);
    if (field) await field.destroy();
    return field;
  }

  async getFieldsByModel(model) {
    return this.models.CustomField.findAll({
      where: { model, status: 'active' },
      order: [['sequence', 'ASC']]
    });
  }

  // ── Custom Views ──────────────────────────────────────────────

  async getCustomViews(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.model) where.model = filters.model;
    if (filters.viewType) where.viewType = filters.viewType;

    return this.models.CustomView.findAll({
      where,
      order: [['model', 'ASC'], ['name', 'ASC']]
    });
  }

  async getCustomView(id) {
    return this.models.CustomView.findByPk(id);
  }

  async createCustomView(data) {
    return this.models.CustomView.create(data);
  }

  async updateCustomView(id, data) {
    const view = await this.models.CustomView.findByPk(id);
    if (!view) return null;
    await view.update(data);
    return view;
  }

  async deleteCustomView(id) {
    const view = await this.models.CustomView.findByPk(id);
    if (view) await view.destroy();
    return view;
  }

  // ── Form Layouts ──────────────────────────────────────────────

  async getFormLayouts(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.model) where.model = filters.model;

    return this.models.FormLayout.findAll({
      where,
      order: [['model', 'ASC'], ['name', 'ASC']]
    });
  }

  async getFormLayout(id) {
    return this.models.FormLayout.findByPk(id);
  }

  async createFormLayout(data) {
    return this.models.FormLayout.create(data);
  }

  async updateFormLayout(id, data) {
    const layout = await this.models.FormLayout.findByPk(id);
    if (!layout) return null;
    await layout.update(data);
    return layout;
  }

  async deleteFormLayout(id) {
    const layout = await this.models.FormLayout.findByPk(id);
    if (layout) await layout.destroy();
    return layout;
  }

  // ── List Configurations ───────────────────────────────────────

  async getListConfigs(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.model) where.model = filters.model;

    return this.models.ListConfig.findAll({
      where,
      order: [['model', 'ASC'], ['name', 'ASC']]
    });
  }

  async getListConfig(id) {
    return this.models.ListConfig.findByPk(id);
  }

  async createListConfig(data) {
    return this.models.ListConfig.create(data);
  }

  async updateListConfig(id, data) {
    const config = await this.models.ListConfig.findByPk(id);
    if (!config) return null;
    await config.update(data);
    return config;
  }

  async deleteListConfig(id) {
    const config = await this.models.ListConfig.findByPk(id);
    if (config) await config.destroy();
    return config;
  }

  // ── Dashboard Widgets ─────────────────────────────────────────

  async getDashboardWidgets(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;

    return this.models.DashboardWidget.findAll({
      where,
      order: [['name', 'ASC']]
    });
  }

  async getDashboardWidget(id) {
    return this.models.DashboardWidget.findByPk(id);
  }

  async createDashboardWidget(data) {
    return this.models.DashboardWidget.create(data);
  }

  async updateDashboardWidget(id, data) {
    const widget = await this.models.DashboardWidget.findByPk(id);
    if (!widget) return null;
    await widget.update(data);
    return widget;
  }

  async deleteDashboardWidget(id) {
    const widget = await this.models.DashboardWidget.findByPk(id);
    if (widget) await widget.destroy();
    return widget;
  }
}

export default { CustomizationService };
