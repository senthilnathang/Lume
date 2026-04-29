/**
 * Metadata-Driven Framework Integration Tests
 * Tests the core runtime kernel services: MetadataRegistry, EntityEngine, WorkflowExecutor
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

describe('Metadata-Driven Framework', () => {
  let metadataRegistry;
  let entityEngine;
  let workflowExecutor;
  let eventBus;

  beforeAll(async () => {
    // Initialize services
    metadataRegistry = new MetadataRegistry();
    entityEngine = new EntityEngine(metadataRegistry);
    workflowExecutor = new WorkflowExecutor(metadataRegistry);
    eventBus = new EventBusService();
  });

  afterAll(async () => {
    // Cleanup
  });

  // ─── MetadataRegistry Tests ─────────────────────────────────────────────────

  describe('MetadataRegistry', () => {
    it('should register an entity definition', () => {
      const entityDef = {
        name: 'Lead',
        label: 'Sales Lead',
        fields: {
          firstName: { type: 'string', label: 'First Name', required: true },
          email: { type: 'email', label: 'Email' },
        },
      };

      metadataRegistry.registerEntity(entityDef);
      const retrieved = metadataRegistry.getEntity('Lead');

      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Lead');
      expect(retrieved.fields.firstName.type).toBe('string');
    });

    it('should list all registered entities', () => {
      const entity1 = { name: 'Contact', label: 'Contact', fields: {} };
      const entity2 = { name: 'Company', label: 'Company', fields: {} };

      metadataRegistry.registerEntity(entity1);
      metadataRegistry.registerEntity(entity2);

      const entities = metadataRegistry.listEntities();
      expect(entities.length).toBeGreaterThanOrEqual(2);
      expect(entities.map((e) => e.name)).toContain('Contact');
      expect(entities.map((e) => e.name)).toContain('Company');
    });

    it('should extend an entity definition', () => {
      const baseDef = {
        name: 'Opportunity',
        label: 'Opportunity',
        fields: { amount: { type: 'number' } },
      };

      metadataRegistry.registerEntity(baseDef);

      const extension = {
        fields: {
          stage: { type: 'select', options: ['prospect', 'qualified', 'closed'] },
        },
      };

      metadataRegistry.extend('Opportunity', extension);
      const resolved = metadataRegistry.resolveEntity('Opportunity');

      expect(resolved.fields.amount).toBeDefined();
      expect(resolved.fields.stage).toBeDefined();
    });

    it('should register and retrieve a module definition', () => {
      const moduleDef = {
        name: 'crm',
        version: '1.0.0',
        depends: ['base'],
        entities: [{ name: 'Lead' }],
        permissions: ['crm.read', 'crm.write'],
      };

      metadataRegistry.registerModule(moduleDef);
      const retrieved = metadataRegistry.getModule('crm');

      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('crm');
      expect(retrieved.entities.length).toBe(1);
    });

    it('should register a workflow definition', () => {
      const workflowDef = {
        name: 'lead_scoring',
        entity: 'Lead',
        trigger: { type: 'record.created' },
        steps: [
          {
            type: 'set_field',
            field: 'leadScore',
            value: 50,
          },
        ],
      };

      metadataRegistry.registerWorkflow(workflowDef);
      const retrieved = metadataRegistry.getWorkflow('lead_scoring');

      expect(retrieved).toBeDefined();
      expect(retrieved.entity).toBe('Lead');
      expect(retrieved.steps.length).toBe(1);
    });

    it('should register and retrieve a policy definition', () => {
      const policyDef = {
        name: 'lead_owner',
        entity: 'Lead',
        actions: ['read', 'update', 'delete'],
        conditions: [{ field: 'owner', operator: '==', value: '$userId' }],
        roles: ['sales'],
      };

      metadataRegistry.registerPolicy(policyDef);
      const retrieved = metadataRegistry.getPolicy('lead_owner');

      expect(retrieved).toBeDefined();
      expect(retrieved.entity).toBe('Lead');
      expect(retrieved.conditions.length).toBe(1);
    });

    it('should register a view definition', () => {
      const viewDef = {
        name: 'leads_kanban',
        entity: 'Lead',
        type: 'kanban',
        label: 'Leads Board',
        config: {
          groupByField: 'status',
          cardTitle: '{{name}}',
        },
      };

      metadataRegistry.registerView(viewDef);
      const retrieved = metadataRegistry.listViewsForEntity('Lead');

      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved.map((v) => v.name)).toContain('leads_kanban');
    });
  });

  // ─── EntityEngine Tests ──────────────────────────────────────────────────────

  describe('EntityEngine', () => {
    beforeEach(() => {
      // Register a test entity
      const testEntity = {
        name: 'TestLead',
        label: 'Test Lead',
        fields: {
          name: { type: 'string', label: 'Name', required: true },
          email: { type: 'email', label: 'Email', isIndexed: true },
          score: { type: 'number', label: 'Lead Score', defaultValue: 0 },
        },
        computed: {
          leadQuality: { formula: 'IF(score > 50, "hot", "warm")' },
        },
        hooks: {
          beforeCreate: async (data) => {
            data.score = data.score || 0;
            return data;
          },
          afterCreate: async (record) => {
            console.log('Lead created:', record.name);
          },
        },
      };

      metadataRegistry.registerEntity(testEntity);
    });

    it('should create an entity with lifecycle hooks', async () => {
      const context = { userId: 1 };
      const data = { name: 'Test Lead', email: 'test@example.com' };

      const record = await entityEngine.create('TestLead', data, context);

      expect(record).toBeDefined();
      expect(record.name).toBe('Test Lead');
      expect(record.score).toBe(0);
    });

    it('should evaluate computed fields', async () => {
      const context = { userId: 1 };
      const data = { name: 'Hot Lead', email: 'hot@example.com', score: 75 };

      const record = await entityEngine.create('TestLead', data, context);

      // Computed field should evaluate to 'hot'
      expect(record.leadQuality).toBe('hot');
    });

    it('should enforce field requirements', async () => {
      const context = { userId: 1 };
      const data = { email: 'invalid@example.com' }; // Missing required 'name'

      expect(async () => {
        await entityEngine.create('TestLead', data, context);
      }).rejects.toThrow();
    });

    it('should use default values for fields', async () => {
      const context = { userId: 1 };
      const data = { name: 'Lead', email: 'lead@example.com' }; // No score provided

      const record = await entityEngine.create('TestLead', data, context);

      expect(record.score).toBe(0); // Should use default value
    });

    it('should retrieve an entity by ID', async () => {
      const context = { userId: 1 };
      const created = await entityEngine.create('TestLead', {
        name: 'Lead 1',
        email: 'lead1@example.com',
      }, context);

      const retrieved = await entityEngine.read('TestLead', created.id, context);

      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Lead 1');
    });

    it('should update an entity record', async () => {
      const context = { userId: 1 };
      const created = await entityEngine.create('TestLead', {
        name: 'Original',
        email: 'original@example.com',
      }, context);

      const updated = await entityEngine.update('TestLead', created.id, {
        name: 'Updated',
        score: 60,
      }, context);

      expect(updated.name).toBe('Updated');
      expect(updated.score).toBe(60);
    });

    it('should delete an entity record', async () => {
      const context = { userId: 1 };
      const created = await entityEngine.create('TestLead', {
        name: 'To Delete',
        email: 'delete@example.com',
      }, context);

      await entityEngine.delete('TestLead', created.id, context);

      const retrieved = await entityEngine.read('TestLead', created.id, context);
      expect(retrieved).toBeNull();
    });
  });

  // ─── WorkflowExecutor Tests ──────────────────────────────────────────────────

  describe('WorkflowExecutor', () => {
    beforeEach(() => {
      // Register workflows
      const scoringWorkflow = {
        name: 'auto_score',
        entity: 'TestLead',
        trigger: { type: 'record.created' },
        steps: [
          {
            type: 'condition',
            if: { field: 'email', operator: '!=', value: null },
            then: [
              { type: 'set_field', field: 'score', value: 50 },
            ],
          },
        ],
      };

      metadataRegistry.registerWorkflow(scoringWorkflow);
    });

    it('should execute a simple workflow', async () => {
      const event = {
        type: 'record.created',
        entity: 'TestLead',
        data: { id: 1, name: 'Test', email: 'test@example.com' },
      };

      const run = await workflowExecutor.execute('auto_score', event);

      expect(run).toBeDefined();
      expect(run.status).toBe('completed');
    });

    it('should handle workflow with conditions', async () => {
      const event = {
        type: 'record.created',
        entity: 'TestLead',
        data: { id: 2, name: 'Test2', email: 'test2@example.com' },
      };

      const run = await workflowExecutor.execute('auto_score', event);

      // Condition should be true, set_field should execute
      expect(run.stepsLog.length).toBeGreaterThan(0);
    });

    it('should emit workflow events', async () => {
      let completedEvent = null;

      eventBus.on('workflow.completed', (event) => {
        completedEvent = event;
      });

      const event = {
        type: 'record.created',
        entity: 'TestLead',
        data: { id: 3, name: 'Test3', email: 'test3@example.com' },
      };

      await workflowExecutor.execute('auto_score', event);

      expect(completedEvent).toBeDefined();
      expect(completedEvent.type).toBe('workflow.completed');
    });

    it('should track workflow execution history', async () => {
      const event = {
        type: 'record.created',
        entity: 'TestLead',
        data: { id: 4, name: 'Test4', email: 'test4@example.com' },
      };

      const run = await workflowExecutor.execute('auto_score', event);
      const history = await workflowExecutor.getRunHistory('auto_score');

      expect(history.length).toBeGreaterThan(0);
      expect(history.map((h) => h.id)).toContain(run.id);
    });
  });

  // ─── Integration Tests ───────────────────────────────────────────────────────

  describe('Integration: Entity + Workflow', () => {
    it('should trigger workflow on entity creation', async () => {
      // Register entity
      const entityDef = {
        name: 'IntegrationLead',
        label: 'Integration Test Lead',
        fields: {
          name: { type: 'string' },
          status: { type: 'select', options: ['new', 'contacted'] },
          assignedTo: { type: 'lookup', references: 'User' },
        },
      };

      metadataRegistry.registerEntity(entityDef);

      // Register workflow
      const workflowDef = {
        name: 'auto_assign',
        entity: 'IntegrationLead',
        trigger: { type: 'record.created' },
        steps: [
          { type: 'set_field', field: 'status', value: 'new' },
        ],
      };

      metadataRegistry.registerWorkflow(workflowDef);

      // Create entity
      const context = { userId: 1 };
      const record = await entityEngine.create('IntegrationLead', {
        name: 'Integration Test',
      }, context);

      expect(record).toBeDefined();

      // Workflow should have been triggered
      const history = await workflowExecutor.getRunHistory('auto_assign');
      expect(history.length).toBeGreaterThan(0);
    });

    it('should enforce policies on entity operations', async () => {
      // Register policy
      const policyDef = {
        name: 'lead_access',
        entity: 'IntegrationLead',
        actions: ['read', 'update'],
        conditions: [{ field: 'owner', operator: '==', value: '$userId' }],
        roles: ['sales'],
      };

      metadataRegistry.registerPolicy(policyDef);

      // Create entity
      const context = { userId: 1, role: 'sales' };
      const record = await entityEngine.create('IntegrationLead', {
        name: 'Policy Test',
        owner: 1,
      }, context);

      // User should be able to read own record
      const retrieved = await entityEngine.read('IntegrationLead', record.id, context);
      expect(retrieved).toBeDefined();

      // Different user should not be able to read
      const otherContext = { userId: 2, role: 'sales' };
      expect(async () => {
        await entityEngine.read('IntegrationLead', record.id, otherContext);
      }).rejects.toThrow();
    });
  });

  // ─── Performance Tests ───────────────────────────────────────────────────────

  describe('Performance', () => {
    it('should register 100 entities in < 1 second', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        metadataRegistry.registerEntity({
          name: `Entity${i}`,
          label: `Entity ${i}`,
          fields: { id: { type: 'number' } },
        });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('should retrieve entity definition in < 10ms', async () => {
      metadataRegistry.registerEntity({
        name: 'PerformanceTestEntity',
        label: 'Performance Test',
        fields: { name: { type: 'string' } },
      });

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        metadataRegistry.getEntity('PerformanceTestEntity');
      }

      const duration = Date.now() - startTime;
      expect(duration / 1000).toBeLessThan(10); // Average < 10ms per lookup
    });

    it('should execute workflow in < 500ms', async () => {
      const event = {
        type: 'record.created',
        entity: 'TestLead',
        data: { id: 100, name: 'Perf Test', email: 'perf@example.com' },
      };

      const startTime = Date.now();
      await workflowExecutor.execute('auto_score', event);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });
  });
});
