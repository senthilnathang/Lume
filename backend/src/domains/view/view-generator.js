/**
 * @fileoverview ViewGenerator - Auto-generate view definitions from entity metadata
 * Produces table, form, kanban, calendar, and timeline views
 */

import ViewDefinition from './view-definition.js';
import logger from '../../core/services/logger.js';

class ViewGenerator {
  /**
   * Generate all default views for an entity
   * @static
   * @param {EntityDefinition} entity - Entity definition
   * @returns {ViewDefinition[]} Array of generated views
   */
  static generateDefaultViews(entity) {
    const views = [];

    try {
      // Always generate table view
      views.push(this.generateTableView(entity));

      // Always generate form view
      views.push(this.generateFormView(entity));

      // Generate kanban if there's a select/enum field
      const kanbanField = entity.fields?.find(f =>
        (f.type === 'select' || f.type === 'status') &&
        (f.name === 'status' || f.name === 'stage' || f.name === 'state')
      );
      if (kanbanField) {
        views.push(this.generateKanbanView(entity, kanbanField));
      }

      // Generate calendar if there's a date field
      const dateField = entity.fields?.find(f =>
        f.type === 'date' || f.type === 'datetime'
      );
      if (dateField) {
        views.push(this.generateCalendarView(entity, dateField));
      }

      // Generate timeline if there are start/end date fields
      const startField = entity.fields?.find(f =>
        (f.name === 'startDate' || f.name === 'start_date') &&
        (f.type === 'date' || f.type === 'datetime')
      );
      const endField = entity.fields?.find(f =>
        (f.name === 'endDate' || f.name === 'end_date') &&
        (f.type === 'date' || f.type === 'datetime')
      );
      if (startField && endField) {
        views.push(this.generateTimelineView(entity, startField, endField));
      }

      logger.debug(`[ViewGenerator] Generated ${views.length} views for ${entity.slug}`);
    } catch (error) {
      logger.error('[ViewGenerator] Error generating views:', error.message);
    }

    return views;
  }

  /**
   * Generate table view
   * @private
   * @static
   * @param {EntityDefinition} entity - Entity definition
   * @returns {ViewDefinition}
   */
  static generateTableView(entity) {
    const columns = entity.fields
      ?.filter(f => !f.computed && f.type !== 'rich-text')
      .slice(0, 8) // Limit to 8 columns by default
      .map(f => f.name) || [];

    return ViewDefinition.table(`${entity.slug}_table`, entity.slug, {
      columns,
      pageSize: 25,
      allowInlineEdit: true,
      allowBulkSelect: true,
      defaultSort: entity.fields?.find(f => f.name === 'createdAt')?.name,
      sortOrder: 'desc',
    });
  }

  /**
   * Generate form view
   * @private
   * @static
   * @param {EntityDefinition} entity - Entity definition
   * @returns {ViewDefinition}
   */
  static generateFormView(entity) {
    const editableFields = entity.fields
      ?.filter(f => !f.computed && !f.readonly)
      .map(f => ({
        name: f.name,
        type: f.type,
        label: this.humanize(f.name),
        required: f.required,
        validation: f.validation || [],
        helpText: f.description,
      })) || [];

    return ViewDefinition.form(`${entity.slug}_form`, entity.slug, {
      sections: [
        {
          title: 'Basic Information',
          fields: editableFields.slice(0, 5),
        },
        {
          title: 'Additional Details',
          fields: editableFields.slice(5),
        },
      ],
      fields: editableFields,
      submitText: 'Save',
      showCancel: true,
      layout: { columns: 2 },
    });
  }

  /**
   * Generate kanban view
   * @private
   * @static
   * @param {EntityDefinition} entity - Entity definition
   * @param {FieldDefinition} groupField - Field to group by
   * @returns {ViewDefinition}
   */
  static generateKanbanView(entity, groupField) {
    const displayFields = entity.fields
      ?.filter(f => !f.computed && f.type !== 'rich-text')
      .slice(0, 3)
      .map(f => f.name) || [];

    const titleField = entity.fields?.find(f => f.type === 'text')?.name || 'id';

    // Standard status values
    const statusValues = groupField.validation
      ?.find(v => v.rule === 'enum')
      ?.values || ['open', 'in_progress', 'closed'];

    const groupColors = {};
    const colorMap = {
      open: '#FF6B6B',
      new: '#FF6B6B',
      'in_progress': '#4ECDC4',
      'in-progress': '#4ECDC4',
      active: '#4ECDC4',
      closed: '#95E1D3',
      done: '#95E1D3',
      resolved: '#95E1D3',
    };

    for (const status of statusValues) {
      groupColors[status] = colorMap[status] || '#A8E6CF';
    }

    return ViewDefinition.kanban(`${entity.slug}_kanban`, entity.slug, {
      groupBy: groupField.name,
      groupOrder: statusValues,
      groupColors,
      displayFields,
      cardTitleField: titleField,
      allowDragDrop: true,
      dragDropField: groupField.name,
    });
  }

  /**
   * Generate calendar view
   * @private
   * @static
   * @param {EntityDefinition} entity - Entity definition
   * @param {FieldDefinition} dateField - Date field
   * @returns {ViewDefinition}
   */
  static generateCalendarView(entity, dateField) {
    const titleField = entity.fields?.find(f => f.type === 'text')?.name || 'id';
    const colorField = entity.fields?.find(f =>
      f.name === 'priority' || f.name === 'status'
    )?.name;

    return ViewDefinition.calendar(`${entity.slug}_calendar`, entity.slug, {
      dateField: dateField.name,
      titleField,
      colorField,
      defaultView: 'month',
    });
  }

  /**
   * Generate timeline view
   * @private
   * @static
   * @param {EntityDefinition} entity - Entity definition
   * @param {FieldDefinition} startField - Start date field
   * @param {FieldDefinition} endField - End date field
   * @returns {ViewDefinition}
   */
  static generateTimelineView(entity, startField, endField) {
    const titleField = entity.fields?.find(f => f.type === 'text')?.name || 'id';
    const groupField = entity.fields?.find(f =>
      f.name === 'status' || f.name === 'assignedTo' || f.name === 'owner'
    )?.name;

    return ViewDefinition.timeline(`${entity.slug}_timeline`, entity.slug, {
      startDateField: startField.name,
      endDateField: endField.name,
      groupBy: groupField,
      titleField,
      allowDragResize: true,
    });
  }

  /**
   * Convert field name to human-readable label
   * @private
   * @static
   * @param {string} fieldName - Field name (snake_case or camelCase)
   * @returns {string} Humanized label
   */
  static humanize(fieldName) {
    return fieldName
      .replace(/([A-Z])/g, ' $1') // camelCase
      .replace(/_/g, ' ') // snake_case
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }
}

export default ViewGenerator;
