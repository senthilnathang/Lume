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
  async getViewMetadata(view, entityId) {
    // Get all fields for the entity
    const { rows: allFields } = await this.fieldsAdapter.findAll({
      where: [['entityId', '=', Number(entityId)]],
      order: [['sequence', 'ASC']],
      limit: 1000,
      offset: 0,
    });

    let columns = [];

    if (view.type === 'list') {
      // For list views, use configured columns or first 5 fields
      if (view.config && view.config.columns && Array.isArray(view.config.columns) && view.config.columns.length > 0) {
        columns = view.config.columns.map(col => ({
          name: col.name || col,
          label: col.label || this._getLabelForField(col.name || col, allFields),
          type: this._getTypeForField(col.name || col, allFields),
          width: col.width || 150,
        }));
      } else {
        // Default to first 5 fields
        columns = allFields.slice(0, 5).map(field => ({
          name: field.name,
          label: field.label,
          type: field.type,
          width: 150,
        }));
      }
    } else if (view.type === 'grid') {
      // For grid views, all fields as cards
      columns = allFields.map(field => ({
        name: field.name,
        label: field.label,
        type: field.type,
      }));
    } else if (view.type === 'form') {
      // For form views, all fields with metadata
      columns = allFields.map(field => ({
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required || false,
        helpText: field.helpText || '',
      }));
    }

    return {
      type: view.type,
      columns,
      pageSize: view.config?.pageSize || 20,
      defaultSort: view.config?.defaultSort || [],
      filters: view.config?.filters || [],
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
}

export default ViewRendererService;
