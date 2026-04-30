/**
 * @fileoverview Unit tests for MetadataRegistry
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import MetadataRegistry from '../../src/core/runtime/registry.js';

describe('MetadataRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new MetadataRegistry(null); // No Redis for unit tests
  });

  it('should initialize empty', () => {
    expect(registry.entities.size).toBe(0);
    expect(registry.workflows.size).toBe(0);
  });

  it('should register and retrieve an entity', async () => {
    const entity = {
      id: '1',
      slug: 'ticket',
      name: 'Ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [],
    };

    await registry.registerEntity(entity);

    expect(registry.hasEntity('ticket')).toBe(true);

    const retrieved = await registry.getEntity('ticket');
    expect(retrieved).toEqual(entity);
  });

  it('should list all entities', async () => {
    const entity1 = {
      id: '1',
      slug: 'ticket',
      name: 'Ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [],
    };

    const entity2 = {
      id: '2',
      slug: 'user',
      name: 'User',
      orm: 'prisma',
      tableName: 'users',
      fields: [],
    };

    await registry.registerEntity(entity1);
    await registry.registerEntity(entity2);

    const entities = await registry.listEntities();
    expect(entities).toHaveLength(2);
    expect(entities.some(e => e.slug === 'ticket')).toBe(true);
    expect(entities.some(e => e.slug === 'user')).toBe(true);
  });

  it('should register and retrieve workflows', async () => {
    const workflow = {
      id: 'ticket.notify',
      trigger: 'onCreate',
      name: 'Notify on Create',
      steps: [],
      status: 'active',
    };

    await registry.registerWorkflow(workflow);

    expect(registry.hasWorkflow('ticket.notify')).toBe(true);

    const retrieved = await registry.getWorkflow('ticket.notify');
    expect(retrieved).toEqual(workflow);
  });

  it('should register and retrieve views', async () => {
    const view = {
      id: 'table',
      type: 'table',
      label: 'Table View',
      columns: ['id', 'name'],
    };

    await registry.registerView('ticket', view);

    const retrieved = await registry.getView('ticket', 'table');
    expect(retrieved).toEqual(view);
  });

  it('should register and retrieve permissions', async () => {
    const policy = {
      resource: 'ticket',
      action: 'create',
      rule: "user.role == 'agent'",
    };

    await registry.registerPermission(policy);

    const policies = await registry.getPermissions('ticket', 'create');
    expect(policies).toHaveLength(1);
    expect(policies[0].rule).toContain('agent');
  });

  it('should register and retrieve agents', async () => {
    const agent = {
      id: 'auto_escalate',
      trigger: "status != 'closed' && daysOpen > 2",
      schedule: '0 */4 * * *',
      action: { type: 'escalate', updates: { priority: 'urgent' } },
    };

    await registry.registerAgent('ticket', agent);

    const retrieved = await registry.getAgent('ticket', 'auto_escalate');
    expect(retrieved).toEqual(agent);
  });

  it('should get all agents for an entity', async () => {
    const agent1 = {
      id: 'auto_escalate',
      trigger: "status != 'closed'",
      action: { type: 'escalate' },
    };

    const agent2 = {
      id: 'auto_assign',
      trigger: 'status == "open"',
      action: { type: 'mutate' },
    };

    await registry.registerAgent('ticket', agent1);
    await registry.registerAgent('ticket', agent2);

    const agents = await registry.getAgents('ticket');
    expect(agents).toHaveLength(2);
  });

  it('should invalidate entity cache', async () => {
    const entity = {
      id: '1',
      slug: 'ticket',
      name: 'Ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [],
    };

    await registry.registerEntity(entity);
    expect(registry.hasEntity('ticket')).toBe(true);

    await registry.invalidateEntity('ticket');
    expect(registry.hasEntity('ticket')).toBe(false);
  });

  it('should clear all caches', async () => {
    const entity = {
      id: '1',
      slug: 'ticket',
      name: 'Ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [],
    };

    const workflow = {
      id: 'ticket.notify',
      trigger: 'onCreate',
      name: 'Notify',
      steps: [],
    };

    await registry.registerEntity(entity);
    await registry.registerWorkflow(workflow);

    expect(registry.entities.size).toBe(1);
    expect(registry.workflows.size).toBe(1);

    await registry.clear();

    expect(registry.entities.size).toBe(0);
    expect(registry.workflows.size).toBe(0);
  });

  it('should return null for non-existent entity', async () => {
    const entity = await registry.getEntity('nonexistent');
    expect(entity).toBeNull();
  });

  it('should return empty array for non-existent permissions', async () => {
    const perms = await registry.getPermissions('nonexistent', 'read');
    expect(perms).toEqual([]);
  });
});
