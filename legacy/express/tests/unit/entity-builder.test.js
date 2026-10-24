/**
 * @fileoverview Unit tests for entity-builder.js
 */

import { describe, it, expect } from '@jest/globals';
import {
  defineEntity,
  defineField,
  defineRelation,
  definePermission,
  defineView,
  defineAgent,
  defineWorkflow,
  entity,
} from '../../src/domains/entity/entity-builder.js';

describe('defineField', () => {
  it('should create a field with basic options', () => {
    const field = defineField('title', 'text', { required: true });

    expect(field.name).toBe('title');
    expect(field.type).toBe('text');
    expect(field.required).toBe(true);
    expect(field.id).toBeDefined();
  });

  it('should throw error when name or type missing', () => {
    expect(() => defineField('', 'text')).toThrow();
    expect(() => defineField('title', '')).toThrow();
  });

  it('should validate computed field has expression', () => {
    expect(() => {
      defineField('computed', 'number', { computed: true });
    }).toThrow('computed_expression');
  });

  it('should not allow required + computed', () => {
    expect(() => {
      defineField('field', 'number', {
        computed: true,
        computed_expression: 'Math.random()',
        required: true,
      });
    }).toThrow('cannot be both required and computed');
  });
});

describe('defineRelation', () => {
  it('should create a relation', () => {
    const relation = defineRelation('author', 'user', 'many-to-one');

    expect(relation.name).toBe('author');
    expect(relation.target).toBe('user');
    expect(relation.type).toBe('many-to-one');
  });

  it('should support all relation types', () => {
    const types = ['many-to-one', 'one-to-many', 'many-to-many'];

    for (const type of types) {
      const relation = defineRelation('test', 'other', type);
      expect(relation.type).toBe(type);
    }
  });
});

describe('definePermission', () => {
  it('should create a permission policy', () => {
    const perm = definePermission('ticket', 'create', {
      rule: "user.role == 'agent'",
    });

    expect(perm.resource).toBe('ticket');
    expect(perm.action).toBe('create');
    expect(perm.rule).toContain('agent');
  });

  it('should support field-level permissions', () => {
    const perm = definePermission('ticket', 'update', {
      fieldLevel: {
        status: "user.role == 'manager'",
        notes: 'true',
      },
    });

    expect(perm.fieldLevel.status).toBeDefined();
    expect(perm.fieldLevel.notes).toBeDefined();
  });
});

describe('defineView', () => {
  it('should create a view', () => {
    const view = defineView('table', {
      columns: ['id', 'title', 'status'],
    });

    expect(view.type).toBe('table');
    expect(view.columns).toContain('id');
  });

  it('should support kanban view with groupBy', () => {
    const view = defineView('kanban', { groupBy: 'status' });

    expect(view.type).toBe('kanban');
    expect(view.groupBy).toBe('status');
  });

  it('should reject invalid view types', () => {
    expect(() => {
      defineView('invalid');
    }).toThrow('Invalid view type');
  });
});

describe('defineAgent', () => {
  it('should create an agent with trigger', () => {
    const agent = defineAgent('auto_escalate', {
      trigger: "status != 'closed'",
      action: { type: 'escalate', updates: { priority: 'urgent' } },
    });

    expect(agent.id).toBe('auto_escalate');
    expect(agent.trigger).toBeDefined();
    expect(agent.action.type).toBe('escalate');
  });

  it('should create an agent with schedule', () => {
    const agent = defineAgent('daily_report', {
      schedule: '0 9 * * *',
      action: { type: 'workflow', workflowId: 'send_report' },
    });

    expect(agent.schedule).toBe('0 9 * * *');
  });

  it('should require trigger or schedule', () => {
    expect(() => {
      defineAgent('bad_agent', { action: { type: 'escalate' } });
    }).toThrow('must have a trigger or schedule');
  });

  it('should require action', () => {
    expect(() => {
      defineAgent('bad_agent', { trigger: 'true' });
    }).toThrow('must have an action');
  });
});

describe('defineWorkflow', () => {
  it('should create a workflow', () => {
    const workflow = defineWorkflow('notify_customer', {
      trigger: 'onCreate',
      name: 'Notify Customer on Create',
      steps: [
        { id: '1', type: 'send_email', config: { to: 'customer@example.com' } },
      ],
    });

    expect(workflow.id).toBe('notify_customer');
    expect(workflow.trigger).toBe('onCreate');
    expect(workflow.steps).toHaveLength(1);
  });

  it('should require trigger and steps', () => {
    expect(() => {
      defineWorkflow('bad', {});
    }).toThrow('must have a trigger');

    expect(() => {
      defineWorkflow('bad', { trigger: 'onCreate' });
    }).toThrow('must have steps');
  });
});

describe('defineEntity', () => {
  it('should create a basic entity', () => {
    const ent = defineEntity({
      slug: 'ticket',
      name: 'Ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [defineField('title', 'text', { required: true })],
    });

    expect(ent.slug).toBe('ticket');
    expect(ent.orm).toBe('drizzle');
    expect(ent.fields).toHaveLength(1);
    expect(ent.id).toBeDefined();
  });

  it('should set defaults for optional fields', () => {
    const ent = defineEntity({
      slug: 'item',
      orm: 'drizzle',
      tableName: 'items',
      fields: [defineField('name', 'text')],
    });

    expect(ent.label).toBe('item');
    expect(ent.softDelete).toBe(true);
    expect(ent.auditable).toBe(true);
  });

  it('should require slug and orm', () => {
    expect(() => {
      defineEntity({ orm: 'drizzle', tableName: 'test', fields: [] });
    }).toThrow('slug is required');

    expect(() => {
      defineEntity({ slug: 'test', tableName: 'test', fields: [] });
    }).toThrow('orm must be');
  });

  it('should support complex entity with all features', () => {
    const ent = defineEntity({
      slug: 'ticket',
      name: 'Support Ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [
        defineField('title', 'text', { required: true }),
        defineField('status', 'select', { required: true }),
        defineField('priority', 'select'),
      ],
      relations: [defineRelation('assignedTo', 'user', 'many-to-one')],
      permissions: [
        definePermission('ticket', 'create', { rule: "user.role == 'agent'" }),
      ],
      views: [defineView('table', { columns: ['title', 'status'] })],
      agents: [
        defineAgent('escalate', {
          trigger: "status != 'closed'",
          action: { type: 'escalate' },
        }),
      ],
    });

    expect(ent.fields).toHaveLength(3);
    expect(ent.relations).toHaveLength(1);
    expect(ent.permissions).toHaveLength(1);
    expect(ent.agents).toHaveLength(1);
  });
});

describe('entity() builder', () => {
  it('should create entity with fluent API', () => {
    const ent = entity('ticket')
      .label('Support Ticket')
      .field(defineField('title', 'text', { required: true }))
      .field(defineField('status', 'select'))
      .permission(definePermission('ticket', 'read', { rule: 'true' }))
      .build();

    expect(ent.slug).toBe('ticket');
    expect(ent.label).toBe('Support Ticket');
    expect(ent.fields).toHaveLength(2);
    expect(ent.permissions).toHaveLength(1);
  });

  it('should chain methods', () => {
    const ent = entity('item')
      .name('Item')
      .orm('prisma')
      .field(defineField('name', 'text'))
      .softDelete(false)
      .auditable(false)
      .build();

    expect(ent.name).toBe('Item');
    expect(ent.orm).toBe('prisma');
    expect(ent.softDelete).toBe(false);
    expect(ent.auditable).toBe(false);
  });

  it('should support hook methods', () => {
    const hookFn = async () => {};

    const ent = entity('test')
      .field(defineField('name', 'text'))
      .beforeCreate(hookFn)
      .afterCreate(hookFn)
      .build();

    expect(ent.hooks.beforeCreate).toHaveLength(1);
    expect(ent.hooks.afterCreate).toHaveLength(1);
  });
});
