/**
 * @fileoverview ViewDefinition types and factories
 * Defines structure for all view types: Table, Form, Kanban, Calendar, Timeline
 */

/**
 * @typedef {Object} ViewDefinition
 * @property {string} id - Unique view ID
 * @property {string} slug - Entity slug this view belongs to
 * @property {string} type - View type (table, form, kanban, calendar, timeline)
 * @property {string} [title] - Display title
 * @property {string} [description] - View description
 * @property {boolean} [default] - Whether this is default view for entity
 * @property {boolean} [readOnly] - Whether view is read-only
 * @property {Object} config - View-specific configuration
 */

/**
 * @typedef {Object} TableViewConfig
 * @property {string[]} columns - Field names to display as columns
 * @property {number} [pageSize] - Rows per page (default 25)
 * @property {string} [defaultSort] - Default sort field
 * @property {string} [sortOrder] - asc or desc
 * @property {Object[]} [filters] - Default filters
 * @property {boolean} [allowInlineEdit] - Allow inline cell editing
 * @property {boolean} [allowBulkSelect] - Show checkboxes for bulk actions
 * @property {string[]} [hiddenColumns] - Fields to hide from user
 * @property {Object} [columnConfig] - Per-column settings { fieldName: { width, align, ... } }
 */

/**
 * @typedef {Object} FormViewConfig
 * @property {string[]} sections - Sections grouping fields
 * @property {Object[]} fields - Form fields with validation rules
 * @property {string} [submitText] - Button label
 * @property {boolean} [showCancel] - Show cancel button
 * @property {boolean} [multiStep] - Multi-step wizard mode
 * @property {Object} [layout] - Form layout config (columns, spacing)
 */

/**
 * @typedef {Object} KanbanViewConfig
 * @property {string} groupBy - Field to group by (usually status)
 * @property {string[]} [groupOrder] - Order of group columns
 * @property {Object} [groupColors] - Color mapping per group value
 * @property {string[]} [displayFields] - Fields to show in each card
 * @property {string} [cardTitleField] - Which field is card title
 * @property {boolean} [allowDragDrop] - Allow drag-to-update
 * @property {string} [dragDropField] - Field to update on drag
 */

/**
 * @typedef {Object} CalendarViewConfig
 * @property {string} dateField - Date field to display on calendar
 * @property {string} [endDateField] - Optional end date for ranges
 * @property {string} [titleField] - Field to show as event title
 * @property {string} [colorField] - Field for event color
 * @property {string} [defaultView] - month, week, day, agenda
 */

/**
 * @typedef {Object} TimelineViewConfig
 * @property {string} startDateField - Start date field
 * @property {string} endDateField - End date field
 * @property {string} [groupBy] - Field to group timeline by
 * @property {string} [titleField] - Display field for items
 * @property {string} [colorField] - Field for item color
 * @property {boolean} [allowDragResize] - Drag to change dates
 */

class ViewDefinition {
  /**
   * Create a table view
   * @static
   * @param {string} id - View ID
   * @param {string} slug - Entity slug
   * @param {TableViewConfig} config - Configuration
   * @returns {ViewDefinition}
   */
  static table(id, slug, config = {}) {
    return {
      id,
      slug,
      type: 'table',
      config: {
        columns: config.columns || [],
        pageSize: config.pageSize || 25,
        defaultSort: config.defaultSort,
        sortOrder: config.sortOrder || 'asc',
        filters: config.filters || [],
        allowInlineEdit: config.allowInlineEdit !== false,
        allowBulkSelect: config.allowBulkSelect !== false,
        hiddenColumns: config.hiddenColumns || [],
        columnConfig: config.columnConfig || {},
      },
    };
  }

  /**
   * Create a form view
   * @static
   * @param {string} id - View ID
   * @param {string} slug - Entity slug
   * @param {FormViewConfig} config - Configuration
   * @returns {ViewDefinition}
   */
  static form(id, slug, config = {}) {
    return {
      id,
      slug,
      type: 'form',
      config: {
        sections: config.sections || [],
        fields: config.fields || [],
        submitText: config.submitText || 'Save',
        showCancel: config.showCancel !== false,
        multiStep: config.multiStep || false,
        layout: config.layout || { columns: 1 },
      },
    };
  }

  /**
   * Create a kanban view
   * @static
   * @param {string} id - View ID
   * @param {string} slug - Entity slug
   * @param {KanbanViewConfig} config - Configuration
   * @returns {ViewDefinition}
   */
  static kanban(id, slug, config = {}) {
    return {
      id,
      slug,
      type: 'kanban',
      config: {
        groupBy: config.groupBy,
        groupOrder: config.groupOrder || [],
        groupColors: config.groupColors || {},
        displayFields: config.displayFields || [],
        cardTitleField: config.cardTitleField,
        allowDragDrop: config.allowDragDrop !== false,
        dragDropField: config.dragDropField,
      },
    };
  }

  /**
   * Create a calendar view
   * @static
   * @param {string} id - View ID
   * @param {string} slug - Entity slug
   * @param {CalendarViewConfig} config - Configuration
   * @returns {ViewDefinition}
   */
  static calendar(id, slug, config = {}) {
    return {
      id,
      slug,
      type: 'calendar',
      config: {
        dateField: config.dateField,
        endDateField: config.endDateField,
        titleField: config.titleField,
        colorField: config.colorField,
        defaultView: config.defaultView || 'month',
      },
    };
  }

  /**
   * Create a timeline view
   * @static
   * @param {string} id - View ID
   * @param {string} slug - Entity slug
   * @param {TimelineViewConfig} config - Configuration
   * @returns {ViewDefinition}
   */
  static timeline(id, slug, config = {}) {
    return {
      id,
      slug,
      type: 'timeline',
      config: {
        startDateField: config.startDateField,
        endDateField: config.endDateField,
        groupBy: config.groupBy,
        titleField: config.titleField,
        colorField: config.colorField,
        allowDragResize: config.allowDragResize !== false,
      },
    };
  }
}

export default ViewDefinition;
