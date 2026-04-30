/**
 * @fileoverview Unit tests for LumeRuntime
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import LumeRuntime from '../../src/core/runtime/runtime.js';
import MetadataRegistry from '../../src/core/runtime/registry.js';
import InterceptorPipeline from '../../src/core/runtime/interceptor-pipeline.js';
import ContextLoader from '../../src/core/runtime/execution-context.js';

describe('LumeRuntime', () => {
  let runtime;
  let registry;
  let pipeline;
  const mockAdapters = {
    prisma: {},
    drizzle: {
      create: async (entity, data) => ({ id: '1', ...data }),
      read: async (entity, id) => ({ id }),
      list: async () => [],
      update: async (entity, id, data) => ({ id, ...data }),
      delete: async (entity, id) => ({ id, deleted: true }),
    },
  };
  const mockServices = {
    hookRegistry: {},
    queueManager: {
      addJob: async () => undefined,
    },
    policyEngine: {
      evaluate: async () => ({ allowed: true }),
    },
  };

  beforeEach(() => {
    registry = new MetadataRegistry(null);
    runtime = new LumeRuntime(registry, new InterceptorPipeline(), mockAdapters, mockServices);
  });

  afterEach(async () => {
    if (registry) {
      await registry.clear();
    }
  });

  it('should initialize without errors', () => {
    expect(runtime).toBeDefined();
    expect(runtime.registry).toBe(registry);
  });

  it('should create a runtime with default interceptors', () => {
    const rt = LumeRuntime.create(registry, mockAdapters, mockServices);
    expect(rt).toBeDefined();
    expect(rt.pipeline).toBeDefined();
  });

  it('should return error when entity not found', async () => {
    const result = await runtime.execute({
      entity: 'nonexistent',
      action: 'read',
      context: ContextLoader.createTestContext(),
    });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('ENTITY_NOT_FOUND');
  });

  it('should execute with a registered entity', async () => {
    const testEntity = {
      id: '1',
      slug: 'test',
      name: 'Test',
      orm: 'drizzle',
      tableName: 'test',
      fields: [],
    };

    await registry.registerEntity(testEntity);

    // Create runtime with full pipeline
    const rt = LumeRuntime.create(registry, mockAdapters, mockServices);

    const result = await rt.execute({
      entity: 'test',
      action: 'create',
      context: ContextLoader.createTestContext(),
      data: { name: 'Test Record' },
    });

    expect(result).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.duration).toBeGreaterThan(0);
  });

  it('should return error when no context provided', async () => {
    const result = await runtime.execute({
      entity: 'test',
      action: 'read',
      // No context
    });

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('NO_CONTEXT');
  });

  it('should extract context from ContextLoader', async () => {
    const testEntity = {
      id: '1',
      slug: 'test',
      name: 'Test',
      orm: 'drizzle',
      tableName: 'test',
      fields: [],
    };

    await registry.registerEntity(testEntity);

    const contextLoader = new ContextLoader();
    const mockReq = {
      user: { id: 'user123', roles: ['admin'] },
      headers: { 'x-org-id': 'org456' },
    };

    const context = await contextLoader.loadFromRequest(mockReq);
    expect(context.userId).toBe('user123');
    expect(context.roles).toContain('admin');
    expect(context.orgId).toBe('org456');
  });

  it('should track interceptors run', async () => {
    const testEntity = {
      id: '1',
      slug: 'test',
      name: 'Test',
      orm: 'drizzle',
      tableName: 'test',
      fields: [],
    };

    await registry.registerEntity(testEntity);

    const rt = LumeRuntime.create(registry, mockAdapters, mockServices);

    const result = await rt.execute({
      entity: 'test',
      action: 'list',
      context: ContextLoader.createTestContext(),
    });

    expect(result.metadata.interceptorsRun).toBeDefined();
    expect(result.metadata.interceptorsRun.length).toBeGreaterThan(0);
  });
});
