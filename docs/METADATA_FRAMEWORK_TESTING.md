# Metadata-Driven Framework Testing Guide

This guide covers how to test the metadata-driven framework components: MetadataRegistry, EntityEngine, WorkflowExecutor, PolicyEvaluator, and ViewEngine.

---

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [Test Patterns](#test-patterns)
5. [Mocking & Fixtures](#mocking--fixtures)
6. [Performance Testing](#performance-testing)
7. [Test Checklist](#test-checklist)

---

## Testing Strategy

The framework uses a layered testing approach:

| Layer | Test Type | Focus | Tools |
|-------|-----------|-------|-------|
| **Layer 0: Runtime Kernel** | Unit + Integration | MetadataRegistry, EventBus, ExecutionPipeline | Jest |
| **Layer 1: Entity Engine** | Unit + Integration | CRUD, hooks, computed fields, versioning | Jest + fixtures |
| **Layer 2: Workflow Engine** | Integration + E2E | Step execution, conditions, async, retries | Jest + E2E |
| **Layer 3: Permission Engine** | Unit + Integration | ABAC evaluation, conditions, deny-all default | Jest |
| **Layer 4: AI + Plugins** | Integration + E2E | AI adapter, plugin sandbox, marketplace | Jest + E2E |

---

## Unit Tests

### Testing MetadataRegistry

```typescript
describe('MetadataRegistry', () => {
  let registry: MetadataRegistry;

  beforeEach(() => {
    registry = new MetadataRegistry();
  });

  describe('Entity Registration', () => {
    it('should register a simple entity', () => {
      const entity = {
        name: 'Lead',
        label: 'Sales Lead',
        fields: {
          name: { type: 'string', label: 'Name', required: true },
        },
      };

      registry.registerEntity(entity);
      const retrieved = registry.getEntity('Lead');

      expect(retrieved.name).toBe('Lead');
      expect(retrieved.fields.name.required).toBe(true);
    });

    it('should throw on duplicate entity registration', () => {
      const entity = { name: 'Contact', label: 'Contact', fields: {} };

      registry.registerEntity(entity);
      expect(() => registry.registerEntity(entity)).toThrow(/already registered/i);
    });

    it('should validate entity definition schema', () => {
      const invalid = {
        // Missing required 'name' field
        label: 'Contact',
        fields: {},
      };

      expect(() => registry.registerEntity(invalid as any)).toThrow(/invalid|required/i);
    });
  });

  describe('Entity Extension', () => {
    it('should extend an existing entity', () => {
      const base = {
        name: 'Opportunity',
        label: 'Opportunity',
        fields: { amount: { type: 'number' } },
      };

      registry.registerEntity(base);
      registry.extend('Opportunity', {
        fields: { stage: { type: 'string' } },
      });

      const resolved = registry.resolveEntity('Opportunity');
      expect(resolved.fields).toHaveProperty('amount');
      expect(resolved.fields).toHaveProperty('stage');
    });

    it('should merge computed fields on extension', () => {
      registry.registerEntity({
        name: 'Invoice',
        label: 'Invoice',
        fields: { subtotal: { type: 'number' }, tax: { type: 'number' } },
        computed: { subtotal: { formula: '50' } },
      });

      registry.extend('Invoice', {
        computed: { total: { formula: '{{subtotal}} + {{tax}}' } },
      });

      const resolved = registry.resolveEntity('Invoice');
      expect(resolved.computed).toHaveProperty('subtotal');
      expect(resolved.computed).toHaveProperty('total');
    });
  });

  describe('Module Registration', () => {
    it('should register a module with dependencies', () => {
      registry.registerModule({
        name: 'crm',
        version: '1.0.0',
        depends: ['base'],
        entities: [{ name: 'Lead' }],
      });

      const module = registry.getModule('crm');
      expect(module.depends).toContain('base');
    });

    it('should validate module dependency cycles', () => {
      registry.registerModule({
        name: 'a',
        version: '1.0.0',
        depends: ['b'],
      });

      registry.registerModule({
        name: 'b',
        version: '1.0.0',
        depends: ['a'],
      });

      // Should detect circular dependency
      expect(() => {
        registry.resolveModuleDependencies(['a', 'b']);
      }).toThrow(/cycle|circular/i);
    });
  });

  describe('Workflow Registration', () => {
    it('should register a workflow with trigger and steps', () => {
      registry.registerWorkflow({
        name: 'lead_scoring',
        entity: 'Lead',
        trigger: { type: 'record.created' },
        steps: [
          { type: 'set_field', field: 'score', value: 50 },
        ],
      });

      const workflow = registry.getWorkflow('lead_scoring');
      expect(workflow.steps).toHaveLength(1);
      expect(workflow.trigger.type).toBe('record.created');
    });

    it('should validate workflow step types', () => {
      expect(() => {
        registry.registerWorkflow({
          name: 'invalid',
          entity: 'Lead',
          trigger: { type: 'record.created' },
          steps: [
            { type: 'invalid_step_type' as any, field: 'x' } as any,
          ],
        });
      }).toThrow();
    });
  });

  describe('Policy Registration', () => {
    it('should register a policy with ABAC conditions', () => {
      registry.registerPolicy({
        name: 'lead_owner',
        entity: 'Lead',
        actions: ['read', 'update'],
        conditions: [{ field: 'owner', operator: '==', value: '$userId' }],
        roles: ['sales'],
      });

      const policy = registry.getPolicy('lead_owner');
      expect(policy.conditions).toHaveLength(1);
      expect(policy.roles).toContain('sales');
    });

    it('should support multiple conditions (AND logic)', () => {
      registry.registerPolicy({
        name: 'open_leads',
        entity: 'Lead',
        actions: ['read'],
        conditions: [
          { field: 'status', operator: '!=', value: 'closed' },
          { field: 'owner', operator: '==', value: '$userId' },
        ],
      });

      const policy = registry.getPolicy('open_leads');
      expect(policy.conditions).toHaveLength(2);
    });
  });

  describe('View Registration', () => {
    it('should register a kanban view', () => {
      registry.registerView({
        name: 'leads_board',
        entity: 'Lead',
        type: 'kanban',
        label: 'Leads Board',
        config: {
          groupByField: 'status',
          cardTitle: '{{name}}',
        },
      });

      const views = registry.listViewsForEntity('Lead');
      expect(views.some((v) => v.name === 'leads_board')).toBe(true);
    });

    it('should register multiple views for same entity', () => {
      registry.registerView({
        name: 'leads_list',
        entity: 'Lead',
        type: 'table',
        label: 'Leads List',
        config: {},
      });

      registry.registerView({
        name: 'leads_form',
        entity: 'Lead',
        type: 'form',
        label: 'Lead Form',
        config: {},
      });

      const views = registry.listViewsForEntity('Lead');
      expect(views).toHaveLength(2);
    });
  });
});
```

### Testing EntityEngine

```typescript
describe('EntityEngine', () => {
  let engine: EntityEngine;
  let registry: MetadataRegistry;

  beforeEach(() => {
    registry = new MetadataRegistry();
    engine = new EntityEngine(registry);

    // Register test entity
    registry.registerEntity({
      name: 'TestEntity',
      label: 'Test Entity',
      fields: {
        name: { type: 'string', required: true },
        email: { type: 'email' },
        score: { type: 'number', defaultValue: 0 },
      },
      computed: {
        quality: { formula: 'IF(score > 50, "high", "low")' },
      },
      hooks: {
        beforeCreate: async (data) => {
          data.name = data.name?.trim();
          return data;
        },
        afterCreate: async (record) => {
          console.log(`Created: ${record.name}`);
        },
      },
    });
  });

  describe('Create Operation', () => {
    it('should create a record with valid data', async () => {
      const record = await engine.create('TestEntity', {
        name: 'Test Record',
        email: 'test@example.com',
      }, { userId: 1 });

      expect(record).toBeDefined();
      expect(record.id).toBeDefined();
      expect(record.name).toBe('Test Record');
    });

    it('should apply default values', async () => {
      const record = await engine.create('TestEntity', {
        name: 'Test',
      }, { userId: 1 });

      expect(record.score).toBe(0);
    });

    it('should execute beforeCreate hook', async () => {
      const record = await engine.create('TestEntity', {
        name: '  spaced  ',
      }, { userId: 1 });

      expect(record.name).toBe('spaced'); // Should be trimmed
    });

    it('should evaluate computed fields', async () => {
      const record = await engine.create('TestEntity', {
        name: 'High Score',
        score: 75,
      }, { userId: 1 });

      expect(record.quality).toBe('high');
    });

    it('should validate required fields', async () => {
      expect(async () => {
        await engine.create('TestEntity', {
          email: 'no-name@example.com',
        }, { userId: 1 });
      }).rejects.toThrow(/required|name/i);
    });

    it('should validate field types', async () => {
      expect(async () => {
        await engine.create('TestEntity', {
          name: 'Test',
          score: 'not a number' as any,
        }, { userId: 1 });
      }).rejects.toThrow(/type|invalid/i);
    });
  });

  describe('Read Operation', () => {
    it('should retrieve a record by ID', async () => {
      const created = await engine.create('TestEntity', {
        name: 'To Read',
      }, { userId: 1 });

      const retrieved = await engine.read('TestEntity', created.id, { userId: 1 });

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('To Read');
    });

    it('should return null for non-existent record', async () => {
      const retrieved = await engine.read('TestEntity', 99999, { userId: 1 });
      expect(retrieved).toBeNull();
    });
  });

  describe('Update Operation', () => {
    it('should update a record', async () => {
      const created = await engine.create('TestEntity', {
        name: 'Original',
      }, { userId: 1 });

      const updated = await engine.update('TestEntity', created.id, {
        name: 'Updated',
        score: 80,
      }, { userId: 1 });

      expect(updated.name).toBe('Updated');
      expect(updated.score).toBe(80);
    });

    it('should execute beforeUpdate hook', async () => {
      const created = await engine.create('TestEntity', {
        name: 'Test',
      }, { userId: 1 });

      // Add beforeUpdate hook
      registry.extend('TestEntity', {
        hooks: {
          beforeUpdate: async (id, data) => {
            data.score = (data.score || 0) + 10;
            return data;
          },
        },
      });

      const updated = await engine.update('TestEntity', created.id, {
        score: 5,
      }, { userId: 1 });

      expect(updated.score).toBe(15); // 5 + 10
    });

    it('should preserve existing fields not in update', async () => {
      const created = await engine.create('TestEntity', {
        name: 'Original',
        email: 'test@example.com',
        score: 50,
      }, { userId: 1 });

      const updated = await engine.update('TestEntity', created.id, {
        name: 'Changed',
      }, { userId: 1 });

      expect(updated.email).toBe('test@example.com');
      expect(updated.score).toBe(50);
    });
  });

  describe('Delete Operation', () => {
    it('should delete a record', async () => {
      const created = await engine.create('TestEntity', {
        name: 'To Delete',
      }, { userId: 1 });

      await engine.delete('TestEntity', created.id, { userId: 1 });

      const retrieved = await engine.read('TestEntity', created.id, { userId: 1 });
      expect(retrieved).toBeNull();
    });

    it('should execute beforeDelete hook', async () => {
      const beforeDeleteSpy = jest.fn();

      registry.extend('TestEntity', {
        hooks: {
          beforeDelete: beforeDeleteSpy,
        },
      });

      const created = await engine.create('TestEntity', {
        name: 'Test',
      }, { userId: 1 });

      await engine.delete('TestEntity', created.id, { userId: 1 });

      expect(beforeDeleteSpy).toHaveBeenCalledWith(created.id, expect.any(Object));
    });
  });
});
```

---

## Integration Tests

### Testing Entity + Workflow

```typescript
describe('Entity + Workflow Integration', () => {
  it('should trigger workflow on record creation', async () => {
    // Register entity
    registry.registerEntity({
      name: 'Lead',
      label: 'Lead',
      fields: { name: { type: 'string' }, status: { type: 'string' } },
    });

    // Register workflow that auto-assigns on creation
    registry.registerWorkflow({
      name: 'auto_assign',
      entity: 'Lead',
      trigger: { type: 'record.created' },
      steps: [
        { type: 'set_field', field: 'status', value: 'assigned' },
      ],
    });

    // Create record
    const record = await entityEngine.create('Lead', { name: 'Test Lead' }, ctx);

    // Workflow should have executed
    const runs = await workflowExecutor.getRunHistory('auto_assign');
    expect(runs.some((r) => r.recordId === record.id)).toBe(true);
  });
});
```

---

## Test Patterns

### Fixture Pattern

```typescript
// fixtures/test-entities.ts
export const leadEntity = {
  name: 'Lead',
  label: 'Sales Lead',
  fields: {
    firstName: { type: 'string', required: true },
    email: { type: 'email' },
    status: { type: 'select', options: ['new', 'contacted', 'qualified'] },
  },
};

export const leadWorkflow = {
  name: 'lead_scoring',
  entity: 'Lead',
  trigger: { type: 'record.created' },
  steps: [{ type: 'set_field', field: 'status', value: 'new' }],
};

// In test
import { leadEntity, leadWorkflow } from './fixtures/test-entities';

registry.registerEntity(leadEntity);
registry.registerWorkflow(leadWorkflow);
```

### Mock Context

```typescript
const mockContext = {
  userId: 1,
  userRole: 'admin',
  userEmail: 'test@example.com',
  timestamp: new Date(),
  ipAddress: '127.0.0.1',
};
```

---

## Performance Testing

```typescript
describe('Performance', () => {
  it('should register 1000 entities efficiently', async () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      registry.registerEntity({
        name: `Entity${i}`,
        label: `Entity ${i}`,
        fields: { id: { type: 'number' } },
      });
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5000); // Less than 5 seconds
  });

  it('should lookup entity in < 1ms average', async () => {
    registry.registerEntity({
      name: 'PerformanceTest',
      label: 'Test',
      fields: {},
    });

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      registry.getEntity('PerformanceTest');
    }
    const duration = performance.now() - start;

    const average = duration / 10000;
    expect(average).toBeLessThan(1);
  });
});
```

---

## Test Checklist

- [ ] MetadataRegistry: Register/retrieve/extend entities, modules, workflows, policies, views
- [ ] EntityEngine: CRUD operations with hooks, computed fields, default values, validation
- [ ] WorkflowExecutor: Execute workflows, handle conditions, async steps, error handling
- [ ] PolicyEvaluator: ABAC conditions, role-based permissions, attribute variables
- [ ] QueryBuilder: Filter, search, groupBy, aggregations, pagination
- [ ] VersioningSystem: Record versions, diffs, restoration
- [ ] Integration: Entity → Workflow → Policy interactions
- [ ] Performance: Registry ops < 5s for 1000 items, lookup < 1ms
- [ ] Error handling: Invalid inputs, missing dependencies, circular references
- [ ] Concurrency: Parallel entity operations, workflow execution
