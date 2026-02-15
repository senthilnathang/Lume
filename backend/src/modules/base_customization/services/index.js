/**
 * Base Customization Services
 */

export class CustomizationService {
  constructor(models) {
    this.models = models;
  }

  // ── Custom Fields ─────────────────────────────────────────────

  async getCustomFields(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.model) where.push(['model', '=', filters.model]);

    const result = await this.models.CustomField.findAll({
      where,
      order: [['model', 'ASC'], ['sequence', 'ASC']]
    });
    return result.rows;
  }

  async getCustomField(id) {
    return this.models.CustomField.findById(id);
  }

  async createCustomField(data) {
    return this.models.CustomField.create(data);
  }

  async updateCustomField(id, data) {
    const existing = await this.models.CustomField.findById(id);
    if (!existing) return null;
    return this.models.CustomField.update(id, data);
  }

  async deleteCustomField(id) {
    const existing = await this.models.CustomField.findById(id);
    if (!existing) return null;
    await this.models.CustomField.destroy(id);
    return existing;
  }

  async getFieldsByModel(model) {
    const result = await this.models.CustomField.findAll({
      where: [['model', '=', model], ['status', '=', 'active']],
      order: [['sequence', 'ASC']]
    });
    return result.rows;
  }

  // ── Custom Views ──────────────────────────────────────────────

  async getCustomViews(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.model) where.push(['model', '=', filters.model]);
    if (filters.viewType) where.push(['viewType', '=', filters.viewType]);

    const result = await this.models.CustomView.findAll({
      where,
      order: [['model', 'ASC'], ['name', 'ASC']]
    });
    return result.rows;
  }

  async getCustomView(id) {
    return this.models.CustomView.findById(id);
  }

  async createCustomView(data) {
    return this.models.CustomView.create(data);
  }

  async updateCustomView(id, data) {
    const existing = await this.models.CustomView.findById(id);
    if (!existing) return null;
    return this.models.CustomView.update(id, data);
  }

  async deleteCustomView(id) {
    const existing = await this.models.CustomView.findById(id);
    if (!existing) return null;
    await this.models.CustomView.destroy(id);
    return existing;
  }

  // ── Form Layouts ──────────────────────────────────────────────

  async getFormLayouts(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.model) where.push(['model', '=', filters.model]);

    const result = await this.models.FormLayout.findAll({
      where,
      order: [['model', 'ASC'], ['name', 'ASC']]
    });
    return result.rows;
  }

  async getFormLayout(id) {
    return this.models.FormLayout.findById(id);
  }

  async createFormLayout(data) {
    return this.models.FormLayout.create(data);
  }

  async updateFormLayout(id, data) {
    const existing = await this.models.FormLayout.findById(id);
    if (!existing) return null;
    return this.models.FormLayout.update(id, data);
  }

  async deleteFormLayout(id) {
    const existing = await this.models.FormLayout.findById(id);
    if (!existing) return null;
    await this.models.FormLayout.destroy(id);
    return existing;
  }

  // ── List Configurations ───────────────────────────────────────

  async getListConfigs(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);
    if (filters.model) where.push(['model', '=', filters.model]);

    const result = await this.models.ListConfig.findAll({
      where,
      order: [['model', 'ASC'], ['name', 'ASC']]
    });
    return result.rows;
  }

  async getListConfig(id) {
    return this.models.ListConfig.findById(id);
  }

  async createListConfig(data) {
    return this.models.ListConfig.create(data);
  }

  async updateListConfig(id, data) {
    const existing = await this.models.ListConfig.findById(id);
    if (!existing) return null;
    return this.models.ListConfig.update(id, data);
  }

  async deleteListConfig(id) {
    const existing = await this.models.ListConfig.findById(id);
    if (!existing) return null;
    await this.models.ListConfig.destroy(id);
    return existing;
  }

  // ── Dashboard Widgets ─────────────────────────────────────────

  async getDashboardWidgets(filters = {}) {
    const where = [];
    if (filters.status) where.push(['status', '=', filters.status]);

    const result = await this.models.DashboardWidget.findAll({
      where,
      order: [['name', 'ASC']]
    });
    return result.rows;
  }

  async getDashboardWidget(id) {
    return this.models.DashboardWidget.findById(id);
  }

  async createDashboardWidget(data) {
    return this.models.DashboardWidget.create(data);
  }

  async updateDashboardWidget(id, data) {
    const existing = await this.models.DashboardWidget.findById(id);
    if (!existing) return null;
    return this.models.DashboardWidget.update(id, data);
  }

  async deleteDashboardWidget(id) {
    const existing = await this.models.DashboardWidget.findById(id);
    if (!existing) return null;
    await this.models.DashboardWidget.destroy(id);
    return existing;
  }
}

export default { CustomizationService };
