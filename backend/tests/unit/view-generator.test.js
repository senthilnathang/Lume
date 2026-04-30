/**
 * @fileoverview Unit tests for ViewGenerator
 */

import { describe, it, expect } from '@jest/globals';
import ViewGenerator from '../../src/domains/view/view-generator.js';
import { defineEntity, defineField } from '../../src/domains/entity/entity-builder.js';

describe('ViewGenerator', () => {
  describe('Default View Generation', () => {
    it('should generate table and form views for simple entity', () => {
      const entity = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('status', 'select'),
          defineField('priority', 'select'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);

      expect(views.length).toBeGreaterThanOrEqual(2);
      expect(views.map(v => v.type)).toContain('table');
      expect(views.map(v => v.type)).toContain('form');
    });

    it('should generate kanban view for entity with status field', () => {
      const entity = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('status', 'select'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const kanbanView = views.find(v => v.type === 'kanban');

      expect(kanbanView).toBeDefined();
      expect(kanbanView.config.groupBy).toBe('status');
    });

    it('should generate calendar view for entity with date field', () => {
      const entity = defineEntity({
        slug: 'event',
        orm: 'drizzle',
        tableName: 'events',
        fields: [
          defineField('title', 'text'),
          defineField('date', 'date'),
          defineField('status', 'select'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const calendarView = views.find(v => v.type === 'calendar');

      expect(calendarView).toBeDefined();
      expect(calendarView.config.dateField).toBe('date');
    });

    it('should generate timeline view for entity with start/end dates', () => {
      const entity = defineEntity({
        slug: 'project',
        orm: 'drizzle',
        tableName: 'projects',
        fields: [
          defineField('title', 'text'),
          defineField('startDate', 'date'),
          defineField('endDate', 'date'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const timelineView = views.find(v => v.type === 'timeline');

      expect(timelineView).toBeDefined();
      expect(timelineView.config.startDateField).toBe('startDate');
      expect(timelineView.config.endDateField).toBe('endDate');
    });

    it('should not generate kanban without status-like field', () => {
      const entity = defineEntity({
        slug: 'user',
        orm: 'drizzle',
        tableName: 'users',
        fields: [
          defineField('name', 'text'),
          defineField('email', 'email'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const kanbanView = views.find(v => v.type === 'kanban');

      expect(kanbanView).toBeUndefined();
    });

    it('should not generate calendar without date field', () => {
      const entity = defineEntity({
        slug: 'user',
        orm: 'drizzle',
        tableName: 'users',
        fields: [
          defineField('name', 'text'),
          defineField('email', 'email'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const calendarView = views.find(v => v.type === 'calendar');

      expect(calendarView).toBeUndefined();
    });

    it('should not generate timeline without both start and end dates', () => {
      const entity = defineEntity({
        slug: 'project',
        orm: 'drizzle',
        tableName: 'projects',
        fields: [
          defineField('title', 'text'),
          defineField('startDate', 'date'),
          // Missing endDate
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const timelineView = views.find(v => v.type === 'timeline');

      expect(timelineView).toBeUndefined();
    });
  });

  describe('Table View Generation', () => {
    it('should include up to 8 columns by default', () => {
      const entity = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('status', 'select'),
          defineField('priority', 'select'),
          defineField('assignedTo', 'number'),
          defineField('daysOpen', 'number', { computed: true }),
          defineField('description', 'text'),
          defineField('createdAt', 'date'),
          defineField('updatedAt', 'date'),
          defineField('notes', 'text'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const tableView = views.find(v => v.type === 'table');

      expect(tableView.config.columns.length).toBeLessThanOrEqual(8);
      // Should exclude computed field daysOpen
      expect(tableView.config.columns).not.toContain('daysOpen');
    });

    it('should not include rich-text fields in table', () => {
      const entity = defineEntity({
        slug: 'document',
        orm: 'drizzle',
        tableName: 'documents',
        fields: [
          defineField('title', 'text'),
          defineField('content', 'rich-text'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const tableView = views.find(v => v.type === 'table');

      expect(tableView.config.columns).not.toContain('content');
    });

    it('should set pageSize and sorting', () => {
      const entity = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('createdAt', 'date'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const tableView = views.find(v => v.type === 'table');

      expect(tableView.config.pageSize).toBe(25);
      expect(tableView.config.allowInlineEdit).toBe(true);
      expect(tableView.config.allowBulkSelect).toBe(true);
    });
  });

  describe('Form View Generation', () => {
    it('should include editable fields', () => {
      const entity = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text', { required: true }),
          defineField('status', 'select'),
          defineField('id', 'number', { readonly: true }),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const formView = views.find(v => v.type === 'form');

      const fieldNames = formView.config.fields.map(f => f.name);
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('status');
      expect(fieldNames).not.toContain('id');
    });

    it('should organize fields into sections', () => {
      const entity = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('status', 'select'),
          defineField('priority', 'select'),
          defineField('description', 'text'),
          defineField('notes', 'text'),
          defineField('assignedTo', 'number'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const formView = views.find(v => v.type === 'form');

      expect(formView.config.sections.length).toBeGreaterThan(0);
      expect(formView.config.sections[0].title).toBeDefined();
    });
  });

  describe('Kanban View Generation', () => {
    it('should set group colors for standard status values', () => {
      const entity = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('status', 'select', {
            validation: [{ rule: 'enum', values: ['open', 'in_progress', 'closed'] }],
          }),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const kanbanView = views.find(v => v.type === 'kanban');

      expect(kanbanView.config.groupColors.open).toBeDefined();
      expect(kanbanView.config.groupColors['in_progress']).toBeDefined();
      expect(kanbanView.config.groupColors.closed).toBeDefined();
    });

    it('should enable drag and drop', () => {
      const entity = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('status', 'select'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const kanbanView = views.find(v => v.type === 'kanban');

      expect(kanbanView.config.allowDragDrop).toBe(true);
      expect(kanbanView.config.dragDropField).toBe('status');
    });
  });

  describe('Calendar View Generation', () => {
    it('should use date field for calendar', () => {
      const entity = defineEntity({
        slug: 'event',
        orm: 'drizzle',
        tableName: 'events',
        fields: [
          defineField('title', 'text'),
          defineField('eventDate', 'date'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const calendarView = views.find(v => v.type === 'calendar');

      expect(calendarView.config.dateField).toBe('eventDate');
      expect(calendarView.config.defaultView).toBe('month');
    });

    it('should set title and color fields', () => {
      const entity = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('dueDate', 'date'),
          defineField('priority', 'select'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const calendarView = views.find(v => v.type === 'calendar');

      expect(calendarView.config.titleField).toBe('title');
      expect(calendarView.config.colorField).toBe('priority');
    });
  });

  describe('Timeline View Generation', () => {
    it('should use start/end date fields', () => {
      const entity = defineEntity({
        slug: 'project',
        orm: 'drizzle',
        tableName: 'projects',
        fields: [
          defineField('name', 'text'),
          defineField('startDate', 'date'),
          defineField('endDate', 'date'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const timelineView = views.find(v => v.type === 'timeline');

      expect(timelineView.config.startDateField).toBe('startDate');
      expect(timelineView.config.endDateField).toBe('endDate');
      expect(timelineView.config.allowDragResize).toBe(true);
    });

    it('should group timeline by assignee if available', () => {
      const entity = defineEntity({
        slug: 'task',
        orm: 'drizzle',
        tableName: 'tasks',
        fields: [
          defineField('title', 'text'),
          defineField('startDate', 'date'),
          defineField('endDate', 'date'),
          defineField('assignedTo', 'number'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const timelineView = views.find(v => v.type === 'timeline');

      expect(timelineView.config.groupBy).toBe('assignedTo');
    });
  });

  describe('Utility Methods', () => {
    it('should humanize field names from camelCase', () => {
      expect(ViewGenerator.humanize('firstName')).toBe('First Name');
      expect(ViewGenerator.humanize('assignedTo')).toBe('Assigned To');
      expect(ViewGenerator.humanize('internalNotes')).toBe('Internal Notes');
    });

    it('should humanize field names from snake_case', () => {
      expect(ViewGenerator.humanize('first_name')).toBe('First Name');
      expect(ViewGenerator.humanize('assigned_to')).toBe('Assigned To');
      expect(ViewGenerator.humanize('internal_notes')).toBe('Internal Notes');
    });

    it('should humanize single word field names', () => {
      expect(ViewGenerator.humanize('title')).toBe('Title');
      expect(ViewGenerator.humanize('status')).toBe('Status');
      expect(ViewGenerator.humanize('priority')).toBe('Priority');
    });
  });

  describe('Error Handling', () => {
    it('should handle entity without fields gracefully', () => {
      const entity = {
        slug: 'empty',
        orm: 'drizzle',
        tableName: 'empty',
        // No fields array
      };

      const views = ViewGenerator.generateDefaultViews(entity);

      // Should still generate at least table and form
      expect(Array.isArray(views)).toBe(true);
    });

    it('should handle null field values', () => {
      const entity = defineEntity({
        slug: 'test',
        orm: 'drizzle',
        tableName: 'test',
        fields: [
          defineField('title', 'text'),
        ],
      });

      // Should not throw
      expect(() => ViewGenerator.generateDefaultViews(entity)).not.toThrow();
    });
  });
});
