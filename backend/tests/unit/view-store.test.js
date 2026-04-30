/**
 * @fileoverview Unit tests for ViewStore
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import ViewStore from '../../src/domains/view/view-store.js';
import ViewDefinition from '../../src/domains/view/view-definition.js';

describe('ViewStore', () => {
  let store;

  beforeEach(() => {
    store = new ViewStore(null);
  });

  describe('Registration', () => {
    it('should register a view', async () => {
      const view = ViewDefinition.table('ticket_table', 'ticket', {
        columns: ['id', 'title', 'status'],
      });

      const registered = await store.register('ticket', view);

      expect(registered.id).toBe('ticket_table');
      expect(store.has('ticket', 'ticket_table')).toBe(true);
    });

    it('should retrieve view by slug and ID', async () => {
      const view = ViewDefinition.form('ticket_form', 'ticket', {
        fields: [],
      });

      await store.register('ticket', view);
      const retrieved = await store.get('ticket', 'ticket_form');

      expect(retrieved.id).toBe('ticket_form');
      expect(retrieved.type).toBe('form');
    });

    it('should get all views for an entity', async () => {
      const table = ViewDefinition.table('ticket_table', 'ticket', {
        columns: ['id', 'title'],
      });
      const form = ViewDefinition.form('ticket_form', 'ticket', {
        fields: [],
      });

      await store.register('ticket', table);
      await store.register('ticket', form);

      const views = await store.getByEntity('ticket');

      expect(views).toHaveLength(2);
      expect(views.map(v => v.id)).toContain('ticket_table');
      expect(views.map(v => v.id)).toContain('ticket_form');
    });

    it('should get views by type', async () => {
      const table1 = ViewDefinition.table('v1', 'ticket', { columns: ['id'] });
      const table2 = ViewDefinition.table('v2', 'ticket', { columns: ['id'] });
      const form = ViewDefinition.form('v3', 'ticket', { fields: [] });

      await store.register('ticket', table1);
      await store.register('ticket', table2);
      await store.register('ticket', form);

      const tables = await store.getByType('ticket', 'table');

      expect(tables).toHaveLength(2);
      expect(tables.every(v => v.type === 'table')).toBe(true);
    });

    it('should set default view', async () => {
      const view = ViewDefinition.table('default_view', 'ticket', {
        columns: ['id'],
        default: true,
      });

      await store.register('ticket', view);

      const defaultView = await store.getDefault('ticket');

      expect(defaultView.id).toBe('default_view');
    });

    it('should return first view as default if none specified', async () => {
      const view1 = ViewDefinition.table('v1', 'ticket', { columns: ['id'] });
      const view2 = ViewDefinition.form('v2', 'ticket', { fields: [] });

      await store.register('ticket', view1);
      await store.register('ticket', view2);

      const defaultView = await store.getDefault('ticket');

      expect(defaultView.id).toBe('v1');
    });

    it('should return null for non-existent entity default', async () => {
      const defaultView = await store.getDefault('nonexistent');

      expect(defaultView).toBeNull();
    });
  });

  describe('Update', () => {
    it('should update view definition', async () => {
      const view = ViewDefinition.table('t1', 'ticket', {
        columns: ['id', 'title'],
        pageSize: 25,
      });

      await store.register('ticket', view);

      const updated = await store.update('ticket', 't1', {
        pageSize: 50,
      });

      expect(updated.config.pageSize).toBe(50);
      expect(updated.config.columns).toEqual(['id', 'title']);
    });

    it('should throw on update of non-existent view', async () => {
      try {
        await store.update('ticket', 'nonexistent', {});
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });

    it('should validate on update', async () => {
      const view = ViewDefinition.table('t1', 'ticket', {
        columns: ['id'],
      });

      await store.register('ticket', view);

      try {
        await store.update('ticket', 't1', {
          columns: [], // Empty columns should fail for table
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });
  });

  describe('Unregister', () => {
    it('should unregister a view', async () => {
      const view = ViewDefinition.table('t1', 'ticket', { columns: ['id'] });

      await store.register('ticket', view);
      expect(store.has('ticket', 't1')).toBe(true);

      await store.unregister('ticket', 't1');

      expect(store.has('ticket', 't1')).toBe(false);
    });

    it('should throw on unregister of non-existent view', async () => {
      try {
        await store.unregister('ticket', 'nonexistent');
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });

    it('should remove from entity views list', async () => {
      const v1 = ViewDefinition.table('v1', 'ticket', { columns: ['id'] });
      const v2 = ViewDefinition.form('v2', 'ticket', { fields: [] });

      await store.register('ticket', v1);
      await store.register('ticket', v2);

      expect(await store.getByEntity('ticket')).toHaveLength(2);

      await store.unregister('ticket', 'v1');

      expect(await store.getByEntity('ticket')).toHaveLength(1);
      expect((await store.getByEntity('ticket'))[0].id).toBe('v2');
    });

    it('should clear default if default view deleted', async () => {
      const view = ViewDefinition.table('default', 'ticket', {
        columns: ['id'],
        default: true,
      });

      await store.register('ticket', view);

      await store.unregister('ticket', 'default');

      const defaultView = await store.getDefault('ticket');

      expect(defaultView).toBeNull();
    });
  });

  describe('Listing', () => {
    it('should list all views', async () => {
      const v1 = ViewDefinition.table('t1', 'ticket', { columns: ['id'] });
      const v2 = ViewDefinition.form('f1', 'user', { fields: [] });

      await store.register('ticket', v1);
      await store.register('user', v2);

      const all = await store.list();

      expect(all).toHaveLength(2);
    });

    it('should return empty list initially', async () => {
      const all = await store.list();

      expect(all).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    it('should reject view without id', async () => {
      const view = {
        slug: 'ticket',
        type: 'table',
        config: { columns: ['id'] },
      };

      try {
        await store.register('ticket', view);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should reject view without slug', async () => {
      const view = {
        id: 'test',
        type: 'table',
        config: { columns: ['id'] },
      };

      try {
        await store.register('ticket', view);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should reject view without type', async () => {
      const view = {
        id: 'test',
        slug: 'ticket',
        config: { columns: ['id'] },
      };

      try {
        await store.register('ticket', view);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should reject invalid view type', async () => {
      const view = {
        id: 'test',
        slug: 'ticket',
        type: 'invalid_type',
        config: {},
      };

      try {
        await store.register('ticket', view);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('type must be one of');
      }
    });

    it('should reject table view without columns', async () => {
      const view = {
        id: 'test',
        slug: 'ticket',
        type: 'table',
        config: {}, // Missing columns
      };

      try {
        await store.register('ticket', view);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should reject kanban view without groupBy', async () => {
      const view = {
        id: 'test',
        slug: 'ticket',
        type: 'kanban',
        config: {}, // Missing groupBy
      };

      try {
        await store.register('ticket', view);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should reject calendar view without dateField', async () => {
      const view = {
        id: 'test',
        slug: 'event',
        type: 'calendar',
        config: {}, // Missing dateField
      };

      try {
        await store.register('event', view);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should reject timeline view without start/end dates', async () => {
      const view = {
        id: 'test',
        slug: 'project',
        type: 'timeline',
        config: {
          startDateField: 'start',
          // Missing endDateField
        },
      };

      try {
        await store.register('project', view);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });
  });

  describe('Clear', () => {
    it('should clear all views', async () => {
      const v1 = ViewDefinition.table('t1', 'ticket', { columns: ['id'] });
      const v2 = ViewDefinition.form('f1', 'user', { fields: [] });

      await store.register('ticket', v1);
      await store.register('user', v2);

      expect(await store.list()).toHaveLength(2);

      await store.clear();

      expect(await store.list()).toHaveLength(0);
      expect(store.has('ticket', 't1')).toBe(false);
    });
  });

  describe('Multiple Entities', () => {
    it('should manage views for multiple entities independently', async () => {
      const ticketTable = ViewDefinition.table('t_table', 'ticket', { columns: ['id'] });
      const ticketForm = ViewDefinition.form('t_form', 'ticket', { fields: [] });
      const userTable = ViewDefinition.table('u_table', 'user', { columns: ['id'] });

      await store.register('ticket', ticketTable);
      await store.register('ticket', ticketForm);
      await store.register('user', userTable);

      const ticketViews = await store.getByEntity('ticket');
      const userViews = await store.getByEntity('user');

      expect(ticketViews).toHaveLength(2);
      expect(userViews).toHaveLength(1);
      expect(ticketViews.map(v => v.slug).every(s => s === 'ticket')).toBe(true);
      expect(userViews.map(v => v.slug).every(s => s === 'user')).toBe(true);
    });
  });

  describe('View Definition Factories', () => {
    it('should create table view with proper config', () => {
      const view = ViewDefinition.table('t1', 'ticket', {
        columns: ['id', 'title'],
        pageSize: 50,
      });

      expect(view.type).toBe('table');
      expect(view.config.columns).toEqual(['id', 'title']);
      expect(view.config.pageSize).toBe(50);
      expect(view.config.allowInlineEdit).toBe(true);
      expect(view.config.allowBulkSelect).toBe(true);
    });

    it('should create form view with sections', () => {
      const view = ViewDefinition.form('f1', 'ticket', {
        sections: [
          { title: 'Basic', fields: [] },
          { title: 'Details', fields: [] },
        ],
      });

      expect(view.type).toBe('form');
      expect(view.config.sections).toHaveLength(2);
    });

    it('should create kanban view with colors', () => {
      const view = ViewDefinition.kanban('k1', 'ticket', {
        groupBy: 'status',
        groupColors: {
          open: '#FF0000',
          closed: '#00FF00',
        },
      });

      expect(view.type).toBe('kanban');
      expect(view.config.groupBy).toBe('status');
      expect(view.config.groupColors.open).toBe('#FF0000');
    });

    it('should create calendar view', () => {
      const view = ViewDefinition.calendar('c1', 'event', {
        dateField: 'eventDate',
        titleField: 'title',
      });

      expect(view.type).toBe('calendar');
      expect(view.config.dateField).toBe('eventDate');
      expect(view.config.titleField).toBe('title');
    });

    it('should create timeline view', () => {
      const view = ViewDefinition.timeline('tl1', 'project', {
        startDateField: 'startDate',
        endDateField: 'endDate',
      });

      expect(view.type).toBe('timeline');
      expect(view.config.startDateField).toBe('startDate');
      expect(view.config.endDateField).toBe('endDate');
    });
  });
});
