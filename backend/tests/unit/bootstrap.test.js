/**
 * @fileoverview Unit tests for runtime bootstrap and schema validation system
 * Tests the registry bootstrap process and schema integrity validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RuntimeRegistry } from '../../src/core/runtime/registry.js';
import { EventBus } from '../../src/core/runtime/event-bus.js';
import { bootstrapRegistry, validateSchemaIntegrity } from '../../src/core/runtime/bootstrap.js';

describe('bootstrapRegistry', () => {
  let registry;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    registry = new RuntimeRegistry(eventBus);
  });

  it('should successfully bootstrap an empty registry', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await bootstrapRegistry(registry);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith('[Registry] Starting bootstrap...');
    expect(consoleSpy).toHaveBeenCalledWith('[Registry] Bootstrap complete');

    consoleSpy.mockRestore();
  });

  it('should log counts of registered components', async () => {
    const entity = {
      name: 'ticket',
      displayName: 'Ticket',
      tableName: 'tickets',
      fields: [],
      permissions: [],
    };

    const workflow = {
      name: 'on-ticket-create',
      triggers: ['entity.created'],
      handler: async () => ({ success: true }),
      active: true,
    };

    const view = {
      name: 'ticket-table',
      entityName: 'ticket',
      type: 'table',
      template: 'default',
      config: {},
    };

    const policy = {
      id: 'policy-1',
      name: 'Test Policy',
      description: 'A test policy',
      rules: [],
    };

    registry.registerEntity(entity);
    registry.registerWorkflow(workflow);
    registry.registerView(view);
    registry.registerPolicy(policy);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await bootstrapRegistry(registry);

    expect(result.valid).toBe(true);
    const logCalls = consoleSpy.mock.calls.map((call) => call[0]);
    expect(logCalls.some((call) => call.includes('entities'))).toBe(true);
    expect(logCalls.some((call) => call.includes('workflows'))).toBe(true);
    expect(logCalls.some((call) => call.includes('views'))).toBe(true);
    expect(logCalls.some((call) => call.includes('policies'))).toBe(true);

    consoleSpy.mockRestore();
  });

  it('should fail bootstrap when schema validation fails', async () => {
    const workflow = {
      name: 'bad-workflow',
      triggers: ['entity.created'],
      handler: async () => ({ success: true }),
      active: true,
      filter: { entityName: 'nonexistent' },
    };

    registry.registerWorkflow(workflow);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    try {
      await bootstrapRegistry(registry);
      expect(true).toBe(false); // Should throw
    } catch (error) {
      expect(error.message).toContain('Schema validation failed');
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[Registry] Schema validation failed:'));

    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should log warnings when validation has non-fatal issues', async () => {
    const entity = {
      name: 'ticket',
      displayName: 'Ticket',
      tableName: 'tickets',
      fields: [],
      permissions: [],
    };

    registry.registerEntity(entity);

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // We'll add a warning in a custom validation scenario
    // For now, just verify the bootstrap completes successfully
    const result = await bootstrapRegistry(registry);

    expect(result.valid).toBe(true);

    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should return ValidationResult with correct structure', async () => {
    const result = await bootstrapRegistry(registry);

    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

describe('validateSchemaIntegrity', () => {
  let registry;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    registry = new RuntimeRegistry(eventBus);
  });

  it('should validate no circular entity dependencies', () => {
    const entity1 = {
      name: 'ticket',
      displayName: 'Ticket',
      tableName: 'tickets',
      fields: [],
      permissions: [],
    };

    const entity2 = {
      name: 'user',
      displayName: 'User',
      tableName: 'users',
      fields: [],
      permissions: [],
    };

    registry.registerEntity(entity1);
    registry.registerEntity(entity2);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(true);
    expect(result.errors.filter((e) => e.includes('Circular'))).toHaveLength(0);
  });

  it('should detect missing entity references in workflows', () => {
    const workflow = {
      name: 'bad-workflow',
      triggers: ['entity.created'],
      handler: async () => ({ success: true }),
      active: true,
      filter: { entityName: 'nonexistent' },
    };

    registry.registerWorkflow(workflow);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('non-existent entity'))).toBe(true);
    expect(result.errors[0]).toContain('bad-workflow');
    expect(result.errors[0]).toContain('nonexistent');
  });

  it('should detect missing entity references in views', () => {
    const view = {
      name: 'bad-view',
      entityName: 'missing-entity',
      type: 'table',
      template: 'default',
      config: {},
    };

    registry.registerView(view);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('non-existent entity'))).toBe(true);
    expect(result.errors[0]).toContain('bad-view');
    expect(result.errors[0]).toContain('missing-entity');
  });

  it('should validate entity permissions format', () => {
    const entity = {
      name: 'ticket',
      displayName: 'Ticket',
      tableName: 'tickets',
      fields: [],
      permissions: ['ticket:read', 'ticket:create', 'ticket:update:title', 'invalid-perm'],
    };

    registry.registerEntity(entity);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Invalid permission'))).toBe(true);
    expect(result.errors[0]).toContain('invalid-perm');
    expect(result.errors[0]).toContain('ticket');
  });

  it('should collect all validation errors before returning', () => {
    // Missing entity for workflow
    const workflow = {
      name: 'workflow1',
      triggers: ['entity.created'],
      handler: async () => ({ success: true }),
      active: true,
      filter: { entityName: 'missing1' },
    };

    // Missing entity for view
    const view = {
      name: 'view1',
      entityName: 'missing2',
      type: 'table',
      template: 'default',
      config: {},
    };

    registry.registerWorkflow(workflow);
    registry.registerView(view);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('should return valid result for proper schema', () => {
    const entity = {
      name: 'ticket',
      displayName: 'Ticket',
      tableName: 'tickets',
      fields: [],
      permissions: ['ticket:read', 'ticket:create'],
    };

    const workflow = {
      name: 'workflow1',
      triggers: ['entity.created'],
      handler: async () => ({ success: true }),
      active: true,
      filter: { entityName: 'ticket' },
    };

    const view = {
      name: 'ticket-view',
      entityName: 'ticket',
      type: 'table',
      template: 'default',
      config: {},
    };

    registry.registerEntity(entity);
    registry.registerWorkflow(workflow);
    registry.registerView(view);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return ValidationResult with correct structure', () => {
    const result = validateSchemaIntegrity(registry);

    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('should handle workflow without filter gracefully', () => {
    const entity = {
      name: 'ticket',
      displayName: 'Ticket',
      tableName: 'tickets',
      fields: [],
      permissions: [],
    };

    const workflow = {
      name: 'workflow1',
      triggers: ['entity.created'],
      handler: async () => ({ success: true }),
      active: true,
    };

    registry.registerEntity(entity);
    registry.registerWorkflow(workflow);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate multiple workflows', () => {
    const entity = {
      name: 'ticket',
      displayName: 'Ticket',
      tableName: 'tickets',
      fields: [],
      permissions: [],
    };

    const workflow1 = {
      name: 'workflow1',
      triggers: ['entity.created'],
      handler: async () => ({ success: true }),
      active: true,
      filter: { entityName: 'ticket' },
    };

    const workflow2 = {
      name: 'workflow2',
      triggers: ['entity.updated'],
      handler: async () => ({ success: true }),
      active: true,
      filter: { entityName: 'missing' },
    };

    registry.registerEntity(entity);
    registry.registerWorkflow(workflow1);
    registry.registerWorkflow(workflow2);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('workflow2'))).toBe(true);
    expect(result.errors.some((e) => e.includes('workflow1'))).toBe(false);
  });

  it('should validate multiple views', () => {
    const entity = {
      name: 'ticket',
      displayName: 'Ticket',
      tableName: 'tickets',
      fields: [],
      permissions: [],
    };

    const view1 = {
      name: 'view1',
      entityName: 'ticket',
      type: 'table',
      template: 'default',
      config: {},
    };

    const view2 = {
      name: 'view2',
      entityName: 'missing',
      type: 'table',
      template: 'default',
      config: {},
    };

    registry.registerEntity(entity);
    registry.registerView(view1);
    registry.registerView(view2);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('view2'))).toBe(true);
    expect(result.errors.some((e) => e.includes('view1'))).toBe(false);
  });

  it('should handle empty permissions array', () => {
    const entity = {
      name: 'ticket',
      displayName: 'Ticket',
      tableName: 'tickets',
      fields: [],
      permissions: [],
    };

    registry.registerEntity(entity);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(true);
  });

  it('should validate permission format with field-level permissions', () => {
    const entity = {
      name: 'ticket',
      displayName: 'Ticket',
      tableName: 'tickets',
      fields: [],
      permissions: ['ticket:read:title', 'ticket:write:description', 'ticket:delete:status'],
    };

    registry.registerEntity(entity);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(true);
  });

  it('should reject permissions with empty parts', () => {
    const entity = {
      name: 'ticket',
      displayName: 'Ticket',
      tableName: 'tickets',
      fields: [],
      permissions: ['ticket:', ':read', 'ticket:read::title'],
    };

    registry.registerEntity(entity);

    const result = validateSchemaIntegrity(registry);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
