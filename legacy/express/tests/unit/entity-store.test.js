/**
 * @fileoverview Unit tests for EntityStore
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import EntityStore from '../../src/domains/entity/entity-store.js';
import MetadataRegistry from '../../src/core/runtime/registry.js';
import { defineEntity, defineField } from '../../src/domains/entity/entity-builder.js';

describe('EntityStore', () => {
  let store;
  let registry;

  beforeEach(() => {
    registry = new MetadataRegistry(null);
    store = new EntityStore(registry);
  });

  it('should initialize empty', () => {
    expect(store.entities.size).toBe(0);
  });

  it('should register an entity', async () => {
    const ent = defineEntity({
      slug: 'ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [defineField('title', 'text')],
    });

    const registered = await store.register(ent);

    expect(registered.slug).toBe('ticket');
    expect(store.has('ticket')).toBe(true);
  });

  it('should register in central registry', async () => {
    const ent = defineEntity({
      slug: 'ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [defineField('title', 'text')],
    });

    await store.register(ent);

    // Verify in registry
    const retrieved = await registry.getEntity('ticket');
    expect(retrieved).toBeDefined();
    expect(retrieved.slug).toBe('ticket');
  });

  it('should get entity by slug', async () => {
    const ent = defineEntity({
      slug: 'user',
      orm: 'prisma',
      tableName: 'users',
      fields: [defineField('email', 'email')],
    });

    await store.register(ent);

    const retrieved = await store.get('user');
    expect(retrieved.slug).toBe('user');
  });

  it('should list all entities', async () => {
    const ent1 = defineEntity({
      slug: 'ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [defineField('title', 'text')],
    });

    const ent2 = defineEntity({
      slug: 'user',
      orm: 'prisma',
      tableName: 'users',
      fields: [defineField('name', 'text')],
    });

    await store.register(ent1);
    await store.register(ent2);

    const list = await store.list();
    expect(list).toHaveLength(2);
  });

  it('should validate entity on register', async () => {
    const invalid = defineEntity({
      slug: 'test',
      orm: 'drizzle',
      tableName: 'test',
      fields: [defineField('name', 'text')],
    });

    // Manually set to invalid state
    invalid.orm = 'invalid';

    try {
      await store.register(invalid);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error.message).toContain('validation failed');
    }
  });

  it('should detect duplicate field names', async () => {
    const ent = defineEntity({
      slug: 'test',
      orm: 'drizzle',
      tableName: 'test',
      fields: [defineField('name', 'text')],
    });

    // Add duplicate field
    ent.fields.push(defineField('name', 'text'));

    try {
      await store.register(ent);
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('duplicate field');
    }
  });

  it('should unregister entity', async () => {
    const ent = defineEntity({
      slug: 'ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [defineField('title', 'text')],
    });

    await store.register(ent);
    expect(store.has('ticket')).toBe(true);

    await store.unregister('ticket');
    expect(store.has('ticket')).toBe(false);
  });

  it('should register agents from entity', async () => {
    const ent = defineEntity({
      slug: 'ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [defineField('title', 'text')],
      agents: [
        {
          id: 'escalate',
          trigger: "status != 'closed'",
          action: { type: 'escalate' },
        },
      ],
    });

    await store.register(ent);

    const agents = await registry.getAgents('ticket');
    expect(agents).toHaveLength(1);
    expect(agents[0].id).toBe('escalate');
  });

  it('should register views from entity', async () => {
    const ent = defineEntity({
      slug: 'ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [defineField('title', 'text')],
      views: [
        { id: 'table', type: 'table', columns: ['title'] },
      ],
    });

    await store.register(ent);

    const views = await registry.getViews('ticket');
    expect(views).toHaveLength(1);
    expect(views[0].id).toBe('table');
  });

  it('should clear all entities', async () => {
    const ent = defineEntity({
      slug: 'ticket',
      orm: 'drizzle',
      tableName: 'tickets',
      fields: [defineField('title', 'text')],
    });

    await store.register(ent);
    expect(store.entities.size).toBe(1);

    await store.clear();
    expect(store.entities.size).toBe(0);
  });
});
