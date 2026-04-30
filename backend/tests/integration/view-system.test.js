/**
 * @fileoverview Integration tests for view system
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import ViewStore from '../../src/domains/view/view-store.js';
import ViewGenerator from '../../src/domains/view/view-generator.js';
import ViewDefinition from '../../src/domains/view/view-definition.js';
import { defineEntity, defineField } from '../../src/domains/entity/entity-builder.js';

describe('View System Integration', () => {
  let store;

  beforeEach(() => {
    store = new ViewStore(null);
  });

  describe('Entity View Generation and Management', () => {
    it('should auto-generate and register views for ticket entity', async () => {
      const ticket = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text', { required: true }),
          defineField('status', 'select', {
            validation: [{ rule: 'enum', values: ['open', 'in_progress', 'closed'] }],
          }),
          defineField('priority', 'select'),
          defineField('assignedTo', 'number'),
          defineField('dueDate', 'date'),
          defineField('createdAt', 'date'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(ticket);
      for (const view of views) {
        await store.register(ticket.slug, view);
      }

      const allViews = await store.getByEntity('ticket');

      expect(allViews.length).toBeGreaterThanOrEqual(4); // table, form, kanban, calendar
      expect(allViews.map(v => v.type)).toContain('table');
      expect(allViews.map(v => v.type)).toContain('form');
      expect(allViews.map(v => v.type)).toContain('kanban');
      expect(allViews.map(v => v.type)).toContain('calendar');
    });

    it('should generate project timeline view with start/end dates', async () => {
      const project = defineEntity({
        slug: 'project',
        orm: 'drizzle',
        tableName: 'projects',
        fields: [
          defineField('name', 'text'),
          defineField('startDate', 'date'),
          defineField('endDate', 'date'),
          defineField('status', 'select'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(project);
      for (const view of views) {
        await store.register(project.slug, view);
      }

      const timelineViews = await store.getByType('project', 'timeline');

      expect(timelineViews.length).toBeGreaterThan(0);
      expect(timelineViews[0].config.startDateField).toBe('startDate');
      expect(timelineViews[0].config.endDateField).toBe('endDate');
    });

    it('should not generate kanban for entities without status field', async () => {
      const user = defineEntity({
        slug: 'user',
        orm: 'drizzle',
        tableName: 'users',
        fields: [
          defineField('name', 'text'),
          defineField('email', 'email'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(user);
      for (const view of views) {
        await store.register(user.slug, view);
      }

      const kanbanViews = await store.getByType('user', 'kanban');

      expect(kanbanViews.length).toBe(0);
    });
  });

  describe('Custom View Management', () => {
    it('should register custom table view with specific columns', async () => {
      const customTable = ViewDefinition.table('my_table', 'ticket', {
        columns: ['title', 'status', 'priority'],
        pageSize: 50,
        allowInlineEdit: true,
      });

      await store.register('ticket', customTable);

      const retrieved = await store.get('ticket', 'my_table');

      expect(retrieved.config.columns).toEqual(['title', 'status', 'priority']);
      expect(retrieved.config.pageSize).toBe(50);
    });

    it('should register multiple views of same type', async () => {
      const table1 = ViewDefinition.table('all_open', 'ticket', {
        columns: ['title', 'status'],
      });

      const table2 = ViewDefinition.table('my_tickets', 'ticket', {
        columns: ['title', 'priority', 'dueDate'],
      });

      await store.register('ticket', table1);
      await store.register('ticket', table2);

      const tables = await store.getByType('ticket', 'table');

      expect(tables).toHaveLength(2);
      expect(tables.map(t => t.id)).toContain('all_open');
      expect(tables.map(t => t.id)).toContain('my_tickets');
    });

    it('should set default view and retrieve it', async () => {
      const primary = ViewDefinition.table('primary', 'ticket', {
        columns: ['title', 'status'],
        default: true,
      });

      const secondary = ViewDefinition.table('secondary', 'ticket', {
        columns: ['title'],
      });

      await store.register('ticket', primary);
      await store.register('ticket', secondary);

      const defaultView = await store.getDefault('ticket');

      expect(defaultView.id).toBe('primary');
    });

    it('should update view configuration', async () => {
      const view = ViewDefinition.kanban('status_board', 'ticket', {
        groupBy: 'status',
        groupColors: { open: '#FF0000', closed: '#00FF00' },
      });

      await store.register('ticket', view);

      const updated = await store.update('ticket', 'status_board', {
        config: {
          ...view.config,
          groupColors: {
            open: '#FFFF00',
            'in_progress': '#00FFFF',
            closed: '#00FF00',
          },
        },
      });

      expect(updated.config.groupColors.open).toBe('#FFFF00');
      expect(updated.config.groupColors['in_progress']).toBe('#00FFFF');
    });
  });

  describe('View Data Filtering and Sorting', () => {
    it('should generate table with default sort', async () => {
      const ticket = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('createdAt', 'date'),
          defineField('status', 'select'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(ticket);
      const tableView = views.find(v => v.type === 'table');

      expect(tableView.config.defaultSort).toBe('createdAt');
      expect(tableView.config.sortOrder).toBe('desc');
    });

    it('should generate kanban with group order', async () => {
      const ticket = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('status', 'select', {
            validation: [{ rule: 'enum', values: ['backlog', 'ready', 'in_progress', 'done'] }],
          }),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(ticket);
      const kanbanView = views.find(v => v.type === 'kanban');

      expect(kanbanView.config.groupOrder).toEqual(['backlog', 'ready', 'in_progress', 'done']);
    });
  });

  describe('Field Type Filtering in Views', () => {
    it('should exclude computed fields from table columns', async () => {
      const entity = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('daysOpen', 'number', { computed: true }),
          defineField('status', 'select'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const tableView = views.find(v => v.type === 'table');

      expect(tableView.config.columns).not.toContain('daysOpen');
    });

    it('should exclude rich-text fields from table columns', async () => {
      const entity = defineEntity({
        slug: 'article',
        orm: 'drizzle',
        tableName: 'articles',
        fields: [
          defineField('title', 'text'),
          defineField('content', 'rich-text'),
          defineField('published', 'boolean'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const tableView = views.find(v => v.type === 'table');

      expect(tableView.config.columns).not.toContain('content');
      expect(tableView.config.columns).toContain('title');
    });

    it('should exclude readonly fields from form', async () => {
      const entity = defineEntity({
        slug: 'ticket',
        orm: 'drizzle',
        tableName: 'tickets',
        fields: [
          defineField('title', 'text'),
          defineField('id', 'number', { readonly: true }),
          defineField('createdAt', 'date', { readonly: true }),
          defineField('status', 'select'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(entity);
      const formView = views.find(v => v.type === 'form');

      const formFieldNames = formView.config.fields.map(f => f.name);
      expect(formFieldNames).toContain('title');
      expect(formFieldNames).toContain('status');
      expect(formFieldNames).not.toContain('id');
      expect(formFieldNames).not.toContain('createdAt');
    });
  });

  describe('Complex View Scenarios', () => {
    it('should generate complete CRM view suite', async () => {
      const contact = defineEntity({
        slug: 'contact',
        orm: 'drizzle',
        tableName: 'contacts',
        fields: [
          defineField('name', 'text', { required: true }),
          defineField('email', 'email'),
          defineField('status', 'select', {
            validation: [{ rule: 'enum', values: ['lead', 'customer', 'inactive'] }],
          }),
          defineField('lastContact', 'date'),
          defineField('notes', 'rich-text'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(contact);
      await Promise.all(views.map(v => store.register(contact.slug, v)));

      const registered = await store.getByEntity('contact');

      expect(registered.length).toBeGreaterThanOrEqual(3);
      expect(registered.map(v => v.type)).toContain('table');
      expect(registered.map(v => v.type)).toContain('form');
      expect(registered.map(v => v.type)).toContain('kanban'); // status field
      expect(registered.map(v => v.type)).toContain('calendar'); // lastContact field
    });

    it('should generate manufacturing/supply chain views', async () => {
      const order = defineEntity({
        slug: 'order',
        orm: 'drizzle',
        tableName: 'orders',
        fields: [
          defineField('orderNumber', 'text'),
          defineField('status', 'select', {
            validation: [{ rule: 'enum', values: ['pending', 'processing', 'shipped', 'delivered'] }],
          }),
          defineField('createdDate', 'date'),
          defineField('shippedDate', 'date'),
          defineField('deliveryDate', 'date'),
          defineField('value', 'number'),
        ],
      });

      const views = ViewGenerator.generateDefaultViews(order);

      expect(views.length).toBeGreaterThanOrEqual(4);

      const kanbanView = views.find(v => v.type === 'kanban');
      expect(kanbanView.config.groupBy).toBe('status');

      const timelineView = views.find(v => v.type === 'timeline');
      expect(timelineView).toBeDefined();
    });
  });

  describe('View Lifecycle', () => {
    it('should register, update, and unregister view', async () => {
      const view = ViewDefinition.table('workflow', 'ticket', {
        columns: ['title', 'status'],
      });

      // Register
      await store.register('ticket', view);
      expect(store.has('ticket', 'workflow')).toBe(true);

      // Update
      const updated = await store.update('ticket', 'workflow', {
        config: {
          columns: ['title', 'status', 'priority'],
        },
      });
      expect(updated.config.columns).toHaveLength(3);

      // Unregister
      await store.unregister('ticket', 'workflow');
      expect(store.has('ticket', 'workflow')).toBe(false);
    });

    it('should handle view migrations', async () => {
      const v1 = ViewDefinition.table('dashboard', 'ticket', {
        columns: ['title', 'status'],
      });

      await store.register('ticket', v1);

      // Upgrade to new column set
      const v2 = ViewDefinition.table('dashboard_v2', 'ticket', {
        columns: ['title', 'status', 'priority', 'assignedTo', 'dueDate'],
      });

      await store.register('ticket', v2);

      // Keep old version for reference
      const oldView = await store.get('ticket', 'dashboard');
      const newView = await store.get('ticket', 'dashboard_v2');

      expect(oldView.config.columns).toHaveLength(2);
      expect(newView.config.columns).toHaveLength(5);
    });
  });
});
