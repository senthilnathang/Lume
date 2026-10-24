/**
 * ViewRendererService - Render entity views with columns and metadata
 *
 * Manages entity view rendering, providing view metadata based on view type (list, grid, form).
 * Handles column/field resolution and metadata generation for different view types.
 *
 * Usage:
 *   import { ViewRendererService } from '../services/view-renderer.service.js';
 *   import { DrizzleAdapter } from '../db/adapters/drizzle-adapter.js';
 *   import { entityViews, entityFields } from '../../modules/base/models/schema.js';
 *
 *   const viewsAdapter = new DrizzleAdapter(entityViews);
 *   const fieldsAdapter = new DrizzleAdapter(entityFields);
 *   const service = new ViewRendererService(viewsAdapter, fieldsAdapter);
 *
 *   // Render a view by ID
 *   const view = await service.renderView(1);
 *   // Returns: { id, type, name, config, isDefault }
 *
 *   // Get view metadata with columns and fields
 *   const metadata = await service.getViewMetadata(view, entityId);
 *   // Returns: { type, columns, pageSize, defaultSort, filters }
 *
 *   // List all views for an entity
 *   const views = await service.getEntityViews(entityId);
 *   // Returns: [{ id, type, name, config, isDefault }, ...]
 */

export class ViewRendererService {
  /**
   * @param {DrizzleAdapter} viewsAdapter - DrizzleAdapter instance for entityViews table
   * @param {DrizzleAdapter} fieldsAdapter - DrizzleAdapter instance for entityFields table
   */
  constructor(viewsAdapter, fieldsAdapter) {
    this.viewsAdapter = viewsAdapter;
    this.fieldsAdapter = fieldsAdapter;
  }

  /**
   * Render a view by ID with parsed config.
   *
   * Retrieves the view from the database, parses its JSON config,
   * and returns the view object with config as a parsed object.
   *
   * @param {number} viewId - View ID
   * @returns {Promise<Object>} View object: { id, type, name, config, isDefault }
   * @throws {Error} If view not found
   */
  async renderView(viewId) {
    const view = await this.viewsAdapter.findById(viewId);

    if (!view) {
      throw new Error('View not found');
    }

    // Parse config if it's a string
    const config = typeof view.config === 'string' ? JSON.parse(view.config) : view.config || {};

    return {
      id: view.id,
      type: view.type,
      name: view.name,
      config,
      isDefault: view.isDefault,
    };
  }

  /**
   * Get metadata for a view including columns and field information.
   *
   * Builds column/field metadata based on the view type:
   * - list: Returns columns from config.columns (if set) or first 5 fields
   * - grid: Returns all fields as cards
   * - form: Returns all fields with required, helpText
   *
   * @param {Object} view - View object returned from renderView
   * @param {number} entityId - Entity ID
   * @returns {Promise<Object>} View metadata: { type, columns, pageSize, defaultSort, filters }
   */
  normalizeConfig(config = {}) {
    const c = config || {};
    return {
      columns: Array.isArray(c.columns) ? c.columns : [],
      filters: Array.isArray(c.filters) ? c.filters : [],
      defaultSort: Array.isArray(c.defaultSort) ? c.defaultSort : (c.sortBy || []),
      groupBy: c.groupBy || null,
      visibleFields: Array.isArray(c.visibleFields) ? c.visibleFields : [],
      pageSize: c.pageSize || 20,
      columnWidths: c.columnWidths || {},
      kanban: {
        columnField: c.kanban?.columnField || c.columnField || null,
        columnOrder: Array.isArray(c.kanban?.columnOrder) ? c.kanban.columnOrder : (c.columnOrder || []),
        columnWidths: c.kanban?.columnWidths || {},
        showNoValue: c.kanban?.showNoValue ?? true,
      },
      calendar: {
        dateField: c.calendar?.dateField || c.dateField || null,
        endField: c.calendar?.endField || c.endField || null,
      },
      visibility: {
        profiles: c.visibility?.profiles || [],
        recordTypes: c.visibility?.recordTypes || [],
        devices: c.visibility?.devices || [],
      },
    };
  }

  async getViewMetadata(view, entityId) {
    const { rows: allFields } = await this.fieldsAdapter.findAll({
      where: [['entityId', '=', Number(entityId)]],
      order: [['sequence', 'ASC']],
      limit: 1000,
      offset: 0,
    });
    const config = this.normalizeConfig(view.config);
    let columns = [];
    let kanban = null;
    let calendar = null;
    if (view.type === 'list' || view.type === 'table') {
      const cols = config.columns.length > 0 ? config.columns : allFields.slice(0, 5).map(f => f.name);
      columns = cols.map(col => ({
        name: col.name || col,
        label: col.label || this._getLabelForField(col.name || col, allFields),
        type: this._getTypeForField(col.name || col, allFields),
        width: col.width || config.columnWidths[col.name || col] || 150,
      }));
    } else if (view.type === 'kanban' || view.type === 'board') {
      const colField = allFields.find(f => f.name === config.kanban.columnField)
        || allFields.find(f => ['select', 'multi-select'].includes(f.type));
      const selectOptions = this._getSelectOptions(colField);
      const ordered = config.kanban.columnOrder.length > 0
        ? config.kanban.columnOrder
        : selectOptions.map(o => (typeof o === 'string' ? o : o.value ?? o.label));
      kanban = {
        columnField: colField?.name || null,
        columnFieldLabel: colField?.label || null,
        columns: ordered,
        columnWidths: config.kanban.columnWidths,
        showNoValue: config.kanban.showNoValue,
      };
      columns = (config.visibleFields.length > 0 ? config.visibleFields : ['id']).map(name => ({
        name, label: this._getLabelForField(name, allFields), type: this._getTypeForField(name, allFields),
      }));
    } else if (view.type === 'calendar') {
      const dateField = allFields.find(f => f.name === config.calendar.dateField)
        || allFields.find(f => ['date', 'datetime'].includes(f.type));
      calendar = { dateField: dateField?.name || null, endField: config.calendar.endField };
      columns = allFields.slice(0, 5).map(field => ({ name: field.name, label: field.label, type: field.type }));
    } else if (view.type === 'grid' || view.type === 'gallery') {
      columns = allFields.map(field => ({ name: field.name, label: field.label, type: field.type }));
    } else if (view.type === 'form') {
      columns = allFields.map(field => ({
        name: field.name, label: field.label, type: field.type,
        required: field.required || false, helpText: field.helpText || '',
      }));
    }
    return {
      type: view.type, columns, pageSize: config.pageSize,
      defaultSort: config.defaultSort, filters: config.filters,
      groupBy: config.groupBy, visibleFields: config.visibleFields,
      kanban, calendar, visibility: config.visibility,
    };
  }

  /**
   * Get all views for an entity.
   *
   * Retrieves all non-deleted views for the entity, parses their configs,
   * and returns them ordered by creation date.
   *
   * @param {number} entityId - Entity ID
   * @returns {Promise<Array>} Array of views with parsed config
   */
  async getEntityViews(entityId) {
    const { rows } = await this.viewsAdapter.findAll({
      where: [['entityId', '=', Number(entityId)]],
      order: [['createdAt', 'ASC']],
      limit: 1000,
      offset: 0,
    });

    return rows.map(view => ({
      id: view.id,
      type: view.type,
      name: view.name,
      config: typeof view.config === 'string' ? JSON.parse(view.config) : view.config || {},
      isDefault: view.isDefault,
    }));
  }

  /**
   * Helper: Get label for a field by name
   * @private
   */
  _getLabelForField(fieldName, fields) {
    const field = fields.find(f => f.name === fieldName);
    return field ? field.label : fieldName;
  }

  /**
   * Helper: Get type for a field by name
   * @private
   */
  _getTypeForField(fieldName, fields) {
    const field = fields.find(f => f.name === fieldName);
    return field ? field.type : 'text';
  }

  _getSelectOptions(field) {
    if (!field) return [];
    try {
      const raw = field.selectOptions;
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

export default ViewRendererService;
