/**
 * @fileoverview Unit tests for WorkflowStore
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import WorkflowStore from '../../src/domains/workflow/workflow-store.js';

describe('WorkflowStore', () => {
  let store;

  beforeEach(() => {
    store = new WorkflowStore(null);
  });

  describe('Registration', () => {
    it('should register a workflow', async () => {
      const workflow = {
        id: 'notify_customer',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [
          { id: 'step1', type: 'send_email', config: {} },
        ],
      };

      const registered = await store.register(workflow);

      expect(registered.id).toBe('notify_customer');
      expect(store.has('notify_customer')).toBe(true);
    });

    it('should retrieve workflow by ID', async () => {
      const workflow = {
        id: 'test_wf',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [{ id: 'step1', type: 'log', config: {} }],
      };

      await store.register(workflow);
      const retrieved = await store.get('test_wf');

      expect(retrieved.id).toBe('test_wf');
    });

    it('should get workflows by entity slug', async () => {
      const wf1 = {
        id: 'ticket_wf1',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      const wf2 = {
        id: 'ticket_wf2',
        slug: 'ticket',
        trigger: 'onUpdate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      const userWf = {
        id: 'user_wf',
        slug: 'user',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      await store.register(wf1);
      await store.register(wf2);
      await store.register(userWf);

      const ticketWorkflows = await store.getByEntity('ticket');

      expect(ticketWorkflows).toHaveLength(2);
      expect(ticketWorkflows.every(w => w.slug === 'ticket')).toBe(true);
    });

    it('should get workflows by trigger type', async () => {
      const wf1 = {
        id: 'onCreate_wf',
        slug: 'ticket',
        trigger: 'onCreate',
        enabled: true,
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      const wf2 = {
        id: 'onUpdate_wf',
        slug: 'ticket',
        trigger: 'onUpdate',
        enabled: true,
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      const wf3 = {
        id: 'scheduled_wf',
        slug: 'ticket',
        trigger: 'onCreate',
        enabled: false, // Disabled
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      await store.register(wf1);
      await store.register(wf2);
      await store.register(wf3);

      const onCreate = await store.getByTrigger('ticket', 'onCreate');

      expect(onCreate).toHaveLength(1); // Only enabled onCreate workflow
      expect(onCreate[0].id).toBe('onCreate_wf');
    });
  });

  describe('Update', () => {
    it('should update workflow definition', async () => {
      const workflow = {
        id: 'wf_update',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      await store.register(workflow);

      const updated = await store.update('wf_update', {
        trigger: 'onUpdate',
      });

      expect(updated.trigger).toBe('onUpdate');
      expect(updated.slug).toBe('ticket'); // Unchanged
    });

    it('should throw on update of non-existent workflow', async () => {
      try {
        await store.update('nonexistent', {});
        expect(true).toBe(false); // Should not reach
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });

    it('should validate on update', async () => {
      const workflow = {
        id: 'wf_validate',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      await store.register(workflow);

      try {
        await store.update('wf_validate', {
          steps: [], // Empty steps should fail
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });
  });

  describe('Unregister', () => {
    it('should unregister workflow', async () => {
      const workflow = {
        id: 'wf_delete',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      await store.register(workflow);
      expect(store.has('wf_delete')).toBe(true);

      await store.unregister('wf_delete');
      expect(store.has('wf_delete')).toBe(false);
    });

    it('should throw on unregister non-existent workflow', async () => {
      try {
        await store.unregister('nonexistent');
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });

    it('should remove from entity workflows list', async () => {
      const wf1 = {
        id: 'wf1',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      const wf2 = {
        id: 'wf2',
        slug: 'ticket',
        trigger: 'onUpdate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      await store.register(wf1);
      await store.register(wf2);

      expect(await store.getByEntity('ticket')).toHaveLength(2);

      await store.unregister('wf1');

      expect(await store.getByEntity('ticket')).toHaveLength(1);
      expect((await store.getByEntity('ticket'))[0].id).toBe('wf2');
    });
  });

  describe('Listing', () => {
    it('should list all workflows', async () => {
      const wf1 = {
        id: 'list_wf1',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      const wf2 = {
        id: 'list_wf2',
        slug: 'user',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      await store.register(wf1);
      await store.register(wf2);

      const all = await store.list();

      expect(all).toHaveLength(2);
      expect(all.map(w => w.id)).toContain('list_wf1');
      expect(all.map(w => w.id)).toContain('list_wf2');
    });

    it('should return empty list initially', async () => {
      const all = await store.list();
      expect(all).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    it('should reject workflow without id', async () => {
      const workflow = {
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      try {
        await store.register(workflow);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
        expect(error.message).toContain('id');
      }
    });

    it('should reject workflow without slug', async () => {
      const workflow = {
        id: 'test',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      try {
        await store.register(workflow);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('slug');
      }
    });

    it('should reject workflow without trigger', async () => {
      const workflow = {
        id: 'test',
        slug: 'ticket',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      try {
        await store.register(workflow);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('trigger');
      }
    });

    it('should reject invalid trigger type', async () => {
      const workflow = {
        id: 'test',
        slug: 'ticket',
        trigger: 'invalid_trigger',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      try {
        await store.register(workflow);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('trigger must be one of');
      }
    });

    it('should require schedule for scheduled trigger', async () => {
      const workflow = {
        id: 'test',
        slug: 'ticket',
        trigger: 'scheduled',
        // Missing schedule
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      try {
        await store.register(workflow);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('schedule is required');
      }
    });

    it('should reject workflow without steps', async () => {
      const workflow = {
        id: 'test',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [],
      };

      try {
        await store.register(workflow);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('steps must be a non-empty array');
      }
    });

    it('should reject step without id', async () => {
      const workflow = {
        id: 'test',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [{ type: 'log', config: {} }], // Missing id
      };

      try {
        await store.register(workflow);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });

    it('should reject step without type', async () => {
      const workflow = {
        id: 'test',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [{ id: 's1', config: {} }], // Missing type
      };

      try {
        await store.register(workflow);
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });
  });

  describe('Clear', () => {
    it('should clear all workflows', async () => {
      const wf1 = {
        id: 'clear_wf1',
        slug: 'ticket',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      const wf2 = {
        id: 'clear_wf2',
        slug: 'user',
        trigger: 'onCreate',
        steps: [{ id: 's1', type: 'log', config: {} }],
      };

      await store.register(wf1);
      await store.register(wf2);

      expect(await store.list()).toHaveLength(2);

      await store.clear();

      expect(await store.list()).toHaveLength(0);
      expect(store.has('clear_wf1')).toBe(false);
      expect(store.has('clear_wf2')).toBe(false);
    });
  });
});
