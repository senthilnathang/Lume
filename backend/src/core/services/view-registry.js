/**
 * ViewRegistry — Plugin system for managing view types (list, grid, form, kanban, calendar, gallery).
 * This is the foundation for Twenty Framework integration, managing different view adapters
 * that render entity data in various visual formats.
 */

/**
 * BaseViewAdapter — Abstract base class for all view adapters.
 * Subclasses must implement render(), getSchema(), and validate().
 */
export class BaseViewAdapter {
  /**
   * Constructor for view adapter.
   * @param {string} entity - Entity name (e.g., 'contacts', 'companies')
   * @param {Array} fields - Array of field definitions
   * @param {Object} config - View configuration options
   */
  constructor(entity, fields, config = {}) {
    this.entity = entity;
    this.fields = fields;
    this.config = config;
  }

  /**
   * Render the view. Must be implemented by subclass.
   * @returns {Object} {component: string, props: Object}
   * @throws {Error} If not overridden
   */
  render() {
    throw new Error(`${this.constructor.name}.render() must be implemented`);
  }

  /**
   * Get schema for this view type. Must be implemented by subclass.
   * @returns {Object} {requiredFields: Array, optionalFields: Array, configSchema: Object}
   * @throws {Error} If not overridden
   */
  getSchema() {
    throw new Error(`${this.constructor.name}.getSchema() must be implemented`);
  }

  /**
   * Validate view configuration. Must be implemented by subclass.
   * @returns {Array} Array of validation error messages (empty if valid)
   * @throws {Error} If not overridden
   */
  validate() {
    throw new Error(`${this.constructor.name}.validate() must be implemented`);
  }
}

/**
 * ViewRegistry — Singleton registry for managing view types.
 * Registers and resolves view adapters used by the framework.
 */
export class ViewRegistry {
  constructor() {
    this.views = new Map();
  }

  /**
   * Register a view adapter type.
   * @param {string} type - View type name (e.g., 'list', 'grid', 'kanban')
   * @param {Class} ViewAdapterClass - Subclass of BaseViewAdapter
   * @throws {Error} If ViewAdapterClass doesn't extend BaseViewAdapter
   */
  register(type, ViewAdapterClass) {
    // Validate that the class extends BaseViewAdapter
    if (!(ViewAdapterClass.prototype instanceof BaseViewAdapter)) {
      throw new Error(`${type} must extend BaseViewAdapter`);
    }

    this.views.set(type, ViewAdapterClass);
  }

  /**
   * Resolve and instantiate a view adapter.
   * @param {string} type - View type name
   * @param {string} entity - Entity name
   * @param {Array} fields - Field definitions
   * @param {Object} config - View configuration
   * @returns {BaseViewAdapter} Instantiated view adapter
   * @throws {Error} If view type is not registered
   */
  resolve(type, entity, fields, config = {}) {
    if (!this.views.has(type)) {
      throw new Error(`View type '${type}' not registered`);
    }

    const ViewAdapterClass = this.views.get(type);
    return new ViewAdapterClass(entity, fields, config);
  }

  /**
   * Get all registered view type names.
   * @returns {Array} Array of registered type names
   */
  getAvailableTypes() {
    return Array.from(this.views.keys());
  }

  /**
   * Create a view configuration object.
   * @param {string} entity - Entity name
   * @param {Array} fields - Field definitions
   * @param {string} viewType - View type name
   * @param {Object} options - Additional configuration options
   * @returns {Object} {type, config, schema}
   */
  createViewConfig(entity, fields, viewType, options = {}) {
    const adapter = this.resolve(viewType, entity, fields, options);
    const schema = adapter.getSchema();
    const errors = adapter.validate();

    return {
      type: viewType,
      config: {
        entity,
        fields,
        ...options,
      },
      schema,
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const viewRegistry = new ViewRegistry();

export default viewRegistry;
