/**
 * @fileoverview Unit tests for RuntimeRegistry
 * Tests the central registry that coordinates all runtime components
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { RuntimeRegistry } from '../../src/core/runtime/registry.js';
import { EventBus } from '../../src/core/runtime/event-bus.js';

describe('RuntimeRegistry', () => {
  let registry;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    registry = new RuntimeRegistry(eventBus);
  });

  describe('Entity Registration', () => {
    it('should register and retrieve entities', () => {
      const entity = {
        name: 'ticket',
        displayName: 'Ticket',
        tableName: 'tickets',
        fields: [
          { name: 'id', type: 'string', required: true, readonly: true, entityName: 'ticket' },
          { name: 'title', type: 'string', required: true, readonly: false, entityName: 'ticket' },
        ],
        permissions: [],
      };

      registry.registerEntity(entity);
      const retrieved = registry.getEntity('ticket');

      expect(retrieved).toEqual(entity);
      expect(retrieved.name).toBe('ticket');
      expect(retrieved.displayName).toBe('Ticket');
    });

    it('should return undefined for non-existent entities', () => {
      const retrieved = registry.getEntity('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should store entities in internal map', () => {
      const entity = {
        name: 'user',
        displayName: 'User',
        tableName: 'users',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'user' }],
        permissions: [],
      };

      registry.registerEntity(entity);

      expect(registry.entities.has('user')).toBe(true);
      expect(registry.entities.get('user')).toEqual(entity);
    });

    it('should throw on duplicate entity registration', () => {
      const entity = {
        name: 'ticket',
        displayName: 'Ticket',
        tableName: 'tickets',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'ticket' }],
        permissions: [],
      };

      registry.registerEntity(entity);

      expect(() => {
        registry.registerEntity(entity);
      }).toThrow('Entity ticket already registered');
    });

    it('should validate entity definition - missing name', () => {
      const entity = {
        displayName: 'Ticket',
        tableName: 'tickets',
        fields: [],
        permissions: [],
      };

      expect(() => {
        registry.registerEntity(entity);
      }).toThrow();
    });

    it('should validate entity definition - missing displayName', () => {
      const entity = {
        name: 'ticket',
        tableName: 'tickets',
        fields: [],
        permissions: [],
      };

      expect(() => {
        registry.registerEntity(entity);
      }).toThrow();
    });

    it('should validate entity definition - missing fields array', () => {
      const entity = {
        name: 'ticket',
        displayName: 'Ticket',
        tableName: 'tickets',
        permissions: [],
      };

      expect(() => {
        registry.registerEntity(entity);
      }).toThrow();
    });

    it('should export all entities as object', () => {
      const entity1 = {
        name: 'ticket',
        displayName: 'Ticket',
        tableName: 'tickets',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'ticket' }],
        permissions: [],
      };

      const entity2 = {
        name: 'user',
        displayName: 'User',
        tableName: 'users',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'user' }],
        permissions: [],
      };

      registry.registerEntity(entity1);
      registry.registerEntity(entity2);

      const all = registry.getAllEntities();

      expect(all).toEqual({
        ticket: entity1,
        user: entity2,
      });
      expect(Object.keys(all)).toHaveLength(2);
    });

    it('should check entity existence', () => {
      const entity = {
        name: 'ticket',
        displayName: 'Ticket',
        tableName: 'tickets',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'ticket' }],
        permissions: [],
      };

      expect(registry.hasEntity('ticket')).toBe(false);
      registry.registerEntity(entity);
      expect(registry.hasEntity('ticket')).toBe(true);
    });

    it('should list all entities', () => {
      const entity1 = {
        name: 'ticket',
        displayName: 'Ticket',
        tableName: 'tickets',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'ticket' }],
        permissions: [],
      };

      const entity2 = {
        name: 'user',
        displayName: 'User',
        tableName: 'users',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'user' }],
        permissions: [],
      };

      registry.registerEntity(entity1);
      registry.registerEntity(entity2);

      const list = registry.listEntities();

      expect(list).toHaveLength(2);
      expect(list).toContainEqual(entity1);
      expect(list).toContainEqual(entity2);
    });
  });

  describe('Workflow Registration', () => {
    it('should register and retrieve workflows', () => {
      const workflow = {
        name: 'on-ticket-create',
        triggers: ['entity.created'],
        handler: async (event, context) => ({ success: true }),
        active: true,
      };

      registry.registerWorkflow(workflow);
      const retrieved = registry.getWorkflow('on-ticket-create');

      expect(retrieved).toEqual(workflow);
      expect(retrieved.name).toBe('on-ticket-create');
    });

    it('should return undefined for non-existent workflows', () => {
      const retrieved = registry.getWorkflow('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should store workflows in internal map', () => {
      const workflow = {
        name: 'test-workflow',
        triggers: ['entity.updated'],
        handler: async () => ({}),
        active: true,
      };

      registry.registerWorkflow(workflow);

      expect(registry.workflows.has('test-workflow')).toBe(true);
      expect(registry.workflows.get('test-workflow')).toEqual(workflow);
    });

    it('should throw on duplicate workflow registration', () => {
      const workflow = {
        name: 'on-ticket-create',
        triggers: ['entity.created'],
        handler: async () => ({}),
        active: true,
      };

      registry.registerWorkflow(workflow);

      expect(() => {
        registry.registerWorkflow(workflow);
      }).toThrow('Workflow on-ticket-create already registered');
    });

    it('should validate workflow definition - missing name', () => {
      const workflow = {
        triggers: ['entity.created'],
        handler: async () => ({}),
        active: true,
      };

      expect(() => {
        registry.registerWorkflow(workflow);
      }).toThrow();
    });

    it('should validate workflow definition - missing triggers array', () => {
      const workflow = {
        name: 'workflow',
        handler: async () => ({}),
        active: true,
      };

      expect(() => {
        registry.registerWorkflow(workflow);
      }).toThrow();
    });

    it('should validate workflow definition - missing handler', () => {
      const workflow = {
        name: 'workflow',
        triggers: ['entity.created'],
        active: true,
      };

      expect(() => {
        registry.registerWorkflow(workflow);
      }).toThrow();
    });

    it('should export all workflows as object', () => {
      const workflow1 = {
        name: 'on-ticket-create',
        triggers: ['entity.created'],
        handler: async () => ({}),
        active: true,
      };

      const workflow2 = {
        name: 'on-ticket-update',
        triggers: ['entity.updated'],
        handler: async () => ({}),
        active: true,
      };

      registry.registerWorkflow(workflow1);
      registry.registerWorkflow(workflow2);

      const all = registry.getAllWorkflows();

      expect(all).toEqual({
        'on-ticket-create': workflow1,
        'on-ticket-update': workflow2,
      });
      expect(Object.keys(all)).toHaveLength(2);
    });

    it('should check workflow existence', () => {
      const workflow = {
        name: 'test-workflow',
        triggers: ['entity.created'],
        handler: async () => ({}),
        active: true,
      };

      expect(registry.hasWorkflow('test-workflow')).toBe(false);
      registry.registerWorkflow(workflow);
      expect(registry.hasWorkflow('test-workflow')).toBe(true);
    });

    it('should list all workflows', () => {
      const workflow1 = {
        name: 'workflow1',
        triggers: ['entity.created'],
        handler: async () => ({}),
        active: true,
      };

      const workflow2 = {
        name: 'workflow2',
        triggers: ['entity.updated'],
        handler: async () => ({}),
        active: true,
      };

      registry.registerWorkflow(workflow1);
      registry.registerWorkflow(workflow2);

      const list = registry.listWorkflows();

      expect(list).toHaveLength(2);
      expect(list).toContainEqual(workflow1);
      expect(list).toContainEqual(workflow2);
    });
  });

  describe('View Registration', () => {
    it('should register and retrieve views', () => {
      const view = {
        name: 'ticket-table',
        entityName: 'ticket',
        type: 'table',
        template: 'default',
        config: { columns: ['id', 'title'] },
      };

      registry.registerView(view);
      const retrieved = registry.getView('ticket-table');

      expect(retrieved).toEqual(view);
      expect(retrieved.name).toBe('ticket-table');
    });

    it('should return undefined for non-existent views', () => {
      const retrieved = registry.getView('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should store views in internal map', () => {
      const view = {
        name: 'user-form',
        entityName: 'user',
        type: 'form',
        template: 'default',
        config: {},
      };

      registry.registerView(view);

      expect(registry.views.has('user-form')).toBe(true);
      expect(registry.views.get('user-form')).toEqual(view);
    });

    it('should throw on duplicate view registration', () => {
      const view = {
        name: 'ticket-table',
        entityName: 'ticket',
        type: 'table',
        template: 'default',
        config: {},
      };

      registry.registerView(view);

      expect(() => {
        registry.registerView(view);
      }).toThrow('View ticket-table already registered');
    });

    it('should validate view definition - missing name', () => {
      const view = {
        entityName: 'ticket',
        type: 'table',
        template: 'default',
        config: {},
      };

      expect(() => {
        registry.registerView(view);
      }).toThrow();
    });

    it('should validate view definition - missing entityName', () => {
      const view = {
        name: 'ticket-table',
        type: 'table',
        template: 'default',
        config: {},
      };

      expect(() => {
        registry.registerView(view);
      }).toThrow();
    });

    it('should validate view definition - missing type', () => {
      const view = {
        name: 'ticket-table',
        entityName: 'ticket',
        template: 'default',
        config: {},
      };

      expect(() => {
        registry.registerView(view);
      }).toThrow();
    });

    it('should validate view type is valid', () => {
      const view = {
        name: 'ticket-view',
        entityName: 'ticket',
        type: 'invalid-type',
        template: 'default',
        config: {},
      };

      expect(() => {
        registry.registerView(view);
      }).toThrow('View type must be one of');
    });

    it('should accept all valid view types', () => {
      const validTypes = ['form', 'table', 'detail', 'custom'];

      for (const type of validTypes) {
        const view = {
          name: `view-${type}`,
          entityName: 'ticket',
          type,
          template: 'default',
          config: {},
        };

        registry.registerView(view);
        expect(registry.hasView(`view-${type}`)).toBe(true);
      }
    });

    it('should check view existence', () => {
      const view = {
        name: 'ticket-table',
        entityName: 'ticket',
        type: 'table',
        template: 'default',
        config: {},
      };

      expect(registry.hasView('ticket-table')).toBe(false);
      registry.registerView(view);
      expect(registry.hasView('ticket-table')).toBe(true);
    });

    it('should list all views', () => {
      const view1 = {
        name: 'ticket-table',
        entityName: 'ticket',
        type: 'table',
        template: 'default',
        config: {},
      };

      const view2 = {
        name: 'user-form',
        entityName: 'user',
        type: 'form',
        template: 'default',
        config: {},
      };

      registry.registerView(view1);
      registry.registerView(view2);

      const list = registry.listViews();

      expect(list).toHaveLength(2);
      expect(list).toContainEqual(view1);
      expect(list).toContainEqual(view2);
    });
  });

  describe('Policy Registration', () => {
    it('should register and retrieve policies', () => {
      const policy = {
        id: 'policy-1',
        name: 'ticket-read-policy',
        description: 'Allow agents to read tickets',
        rules: [
          {
            effect: 'allow',
            resource: 'ticket',
            action: 'read',
          },
        ],
      };

      registry.registerPolicy(policy);
      const retrieved = registry.getPolicy('policy-1');

      expect(retrieved).toEqual(policy);
      expect(retrieved.id).toBe('policy-1');
    });

    it('should return undefined for non-existent policies', () => {
      const retrieved = registry.getPolicy('nonexistent');
      expect(retrieved).toBeUndefined();
    });

    it('should store policies in internal map', () => {
      const policy = {
        id: 'policy-1',
        name: 'test-policy',
        description: 'Test policy',
        rules: [],
      };

      registry.registerPolicy(policy);

      expect(registry.policies.has('policy-1')).toBe(true);
      expect(registry.policies.get('policy-1')).toEqual(policy);
    });

    it('should throw on duplicate policy registration', () => {
      const policy = {
        id: 'policy-1',
        name: 'test-policy',
        description: 'Test',
        rules: [],
      };

      registry.registerPolicy(policy);

      expect(() => {
        registry.registerPolicy(policy);
      }).toThrow('Policy policy-1 already registered');
    });

    it('should validate policy definition - missing id', () => {
      const policy = {
        name: 'policy',
        description: 'Policy',
        rules: [],
      };

      expect(() => {
        registry.registerPolicy(policy);
      }).toThrow();
    });

    it('should validate policy definition - missing name', () => {
      const policy = {
        id: 'policy-1',
        description: 'Policy',
        rules: [],
      };

      expect(() => {
        registry.registerPolicy(policy);
      }).toThrow();
    });

    it('should validate policy definition - missing rules array', () => {
      const policy = {
        id: 'policy-1',
        name: 'policy',
        description: 'Policy',
      };

      expect(() => {
        registry.registerPolicy(policy);
      }).toThrow();
    });

    it('should check policy existence', () => {
      const policy = {
        id: 'policy-1',
        name: 'test-policy',
        description: 'Test',
        rules: [],
      };

      expect(registry.hasPolicy('policy-1')).toBe(false);
      registry.registerPolicy(policy);
      expect(registry.hasPolicy('policy-1')).toBe(true);
    });

    it('should list all policies', () => {
      const policy1 = {
        id: 'policy-1',
        name: 'policy1',
        description: 'Policy 1',
        rules: [],
      };

      const policy2 = {
        id: 'policy-2',
        name: 'policy2',
        description: 'Policy 2',
        rules: [],
      };

      registry.registerPolicy(policy1);
      registry.registerPolicy(policy2);

      const list = registry.listPolicies();

      expect(list).toHaveLength(2);
      expect(list).toContainEqual(policy1);
      expect(list).toContainEqual(policy2);
    });
  });

  describe('Module Registration', () => {
    it('should register modules and their definitions', () => {
      const module = {
        name: 'ticket-module',
        version: '1.0.0',
        description: 'Ticket management module',
        depends: [],
        entities: [
          {
            name: 'ticket',
            displayName: 'Ticket',
            tableName: 'tickets',
            fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'ticket' }],
            permissions: [],
          },
        ],
        workflows: [
          {
            name: 'on-ticket-create',
            triggers: ['entity.created'],
            handler: async () => ({}),
            active: true,
          },
        ],
        views: [
          {
            name: 'ticket-table',
            entityName: 'ticket',
            type: 'table',
            template: 'default',
            config: {},
          },
        ],
        policies: [
          {
            id: 'policy-1',
            name: 'ticket-policy',
            description: 'Ticket policy',
            rules: [],
          },
        ],
      };

      registry.registerModule(module);

      expect(registry.modules.has('ticket-module')).toBe(true);
      expect(registry.getEntity('ticket')).toBeDefined();
      expect(registry.getWorkflow('on-ticket-create')).toBeDefined();
      expect(registry.getView('ticket-table')).toBeDefined();
      expect(registry.getPolicy('policy-1')).toBeDefined();
    });

    it('should throw when registering module with same name', () => {
      const module = {
        name: 'ticket-module',
        version: '1.0.0',
        description: 'Ticket module',
        depends: [],
        entities: [],
        workflows: [],
        views: [],
        policies: [],
      };

      registry.registerModule(module);

      expect(() => {
        registry.registerModule(module);
      }).toThrow('Module ticket-module already registered');
    });

    it('should register module without dependent items', () => {
      const module = {
        name: 'empty-module',
        version: '1.0.0',
        description: 'Empty module',
        depends: [],
        entities: [],
        workflows: [],
        views: [],
        policies: [],
      };

      registry.registerModule(module);

      expect(registry.modules.has('empty-module')).toBe(true);
    });

    it('should get registered module', () => {
      const module = {
        name: 'test-module',
        version: '1.0.0',
        description: 'Test module',
        depends: [],
        entities: [],
        workflows: [],
        views: [],
        policies: [],
      };

      registry.registerModule(module);
      const retrieved = registry.getModule('test-module');

      expect(retrieved).toEqual(module);
    });
  });

  describe('Event Execution', () => {
    it('should execute events', async () => {
      const entity = {
        name: 'ticket',
        displayName: 'Ticket',
        tableName: 'tickets',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'ticket' }],
        permissions: [],
      };

      registry.registerEntity(entity);

      const event = {
        id: 'event-1',
        type: 'entity.created',
        entityName: 'ticket',
        action: 'create',
        recordId: '123',
        data: { id: '123', title: 'New Ticket' },
        context: {
          userId: 'user-1',
          role: 'admin',
          permissions: [],
          requestId: 'req-1',
          domain: 'default',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      const result = await registry.executeEvent(event);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(event);
    });

    it('should return error if entity not found in event', async () => {
      const event = {
        id: 'event-1',
        type: 'entity.created',
        entityName: 'nonexistent',
        action: 'create',
        recordId: '123',
        data: {},
        context: {
          userId: 'user-1',
          role: 'admin',
          permissions: [],
          requestId: 'req-1',
          domain: 'default',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      const result = await registry.executeEvent(event);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Entity nonexistent not registered');
    });

    it('should trigger matching workflows', async () => {
      const entity = {
        name: 'ticket',
        displayName: 'Ticket',
        tableName: 'tickets',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'ticket' }],
        permissions: [],
      };

      let workflowCalled = false;

      const workflow = {
        name: 'on-ticket-create',
        triggers: ['entity.created'],
        handler: async () => {
          workflowCalled = true;
          return { success: true };
        },
        active: true,
      };

      registry.registerEntity(entity);
      registry.registerWorkflow(workflow);

      const event = {
        id: 'event-1',
        type: 'entity.created',
        entityName: 'ticket',
        action: 'create',
        recordId: '123',
        data: { id: '123' },
        context: {
          userId: 'user-1',
          role: 'admin',
          permissions: [],
          requestId: 'req-1',
          domain: 'default',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      const result = await registry.executeEvent(event);

      expect(result.success).toBe(true);
      // Give async queue a moment to process
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(workflowCalled).toBe(true);
    });

    it('should filter workflows by filter conditions', async () => {
      const entity = {
        name: 'ticket',
        displayName: 'Ticket',
        tableName: 'tickets',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'ticket' }],
        permissions: [],
      };

      let workflowCalled = false;

      const workflow = {
        name: 'on-high-priority-create',
        triggers: ['entity.created'],
        filter: {
          priority: 'high',
        },
        handler: async () => {
          workflowCalled = true;
          return { success: true };
        },
        active: true,
      };

      registry.registerEntity(entity);
      registry.registerWorkflow(workflow);

      // Event with low priority - should not trigger
      const eventLow = {
        id: 'event-1',
        type: 'entity.created',
        entityName: 'ticket',
        action: 'create',
        recordId: '123',
        data: { id: '123', priority: 'low' },
        context: {
          userId: 'user-1',
          role: 'admin',
          permissions: [],
          requestId: 'req-1',
          domain: 'default',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      await registry.executeEvent(eventLow);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(workflowCalled).toBe(false);

      // Event with high priority - should trigger
      const eventHigh = {
        id: 'event-2',
        type: 'entity.created',
        entityName: 'ticket',
        action: 'create',
        recordId: '124',
        data: { id: '124', priority: 'high' },
        context: {
          userId: 'user-1',
          role: 'admin',
          permissions: [],
          requestId: 'req-2',
          domain: 'default',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      await registry.executeEvent(eventHigh);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(workflowCalled).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty registry queries', () => {
      expect(registry.getAllEntities()).toEqual({});
      expect(registry.getAllWorkflows()).toEqual({});
      expect(registry.listEntities()).toEqual([]);
      expect(registry.listWorkflows()).toEqual([]);
      expect(registry.listViews()).toEqual([]);
      expect(registry.listPolicies()).toEqual([]);
    });

    it('should handle module with no dependencies', () => {
      const module = {
        name: 'standalone',
        version: '1.0.0',
        description: 'Standalone module',
        depends: [],
        entities: [],
        workflows: [],
        views: [],
        policies: [],
      };

      expect(() => {
        registry.registerModule(module);
      }).not.toThrow();
    });

    it('should support multiple workflows for same event type', async () => {
      const entity = {
        name: 'ticket',
        displayName: 'Ticket',
        tableName: 'tickets',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'ticket' }],
        permissions: [],
      };

      const calls = [];

      const workflow1 = {
        name: 'workflow-1',
        triggers: ['entity.created'],
        handler: async () => {
          calls.push('workflow-1');
          return { success: true };
        },
        active: true,
      };

      const workflow2 = {
        name: 'workflow-2',
        triggers: ['entity.created'],
        handler: async () => {
          calls.push('workflow-2');
          return { success: true };
        },
        active: true,
      };

      registry.registerEntity(entity);
      registry.registerWorkflow(workflow1);
      registry.registerWorkflow(workflow2);

      const event = {
        id: 'event-1',
        type: 'entity.created',
        entityName: 'ticket',
        action: 'create',
        recordId: '123',
        data: { id: '123' },
        context: {
          userId: 'user-1',
          role: 'admin',
          permissions: [],
          requestId: 'req-1',
          domain: 'default',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      await registry.executeEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(calls).toContain('workflow-1');
      expect(calls).toContain('workflow-2');
    });

    it('should handle workflow execution errors gracefully', async () => {
      const entity = {
        name: 'ticket',
        displayName: 'Ticket',
        tableName: 'tickets',
        fields: [{ name: 'id', type: 'string', required: true, readonly: true, entityName: 'ticket' }],
        permissions: [],
      };

      const workflow = {
        name: 'failing-workflow',
        triggers: ['entity.created'],
        handler: async () => {
          throw new Error('Workflow failed');
        },
        active: true,
      };

      registry.registerEntity(entity);
      registry.registerWorkflow(workflow);

      const event = {
        id: 'event-1',
        type: 'entity.created',
        entityName: 'ticket',
        action: 'create',
        recordId: '123',
        data: { id: '123' },
        context: {
          userId: 'user-1',
          role: 'admin',
          permissions: [],
          requestId: 'req-1',
          domain: 'default',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      // Should not throw
      const result = await registry.executeEvent(event);
      expect(result.success).toBe(true);
    });
  });
});
