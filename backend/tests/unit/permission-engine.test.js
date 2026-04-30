/**
 * @fileoverview Unit tests for PolicyEngine and ExpressionEvaluator
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import PolicyEngine from '../../src/core/permissions/policy-engine.js';
import ExpressionEvaluator from '../../src/core/permissions/evaluator.js';
import MetadataRegistry from '../../src/core/runtime/registry.js';

describe('ExpressionEvaluator', () => {
  let evaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator();
  });

  it('should evaluate simple equality', async () => {
    const context = { user: { role: 'admin' } };
    const result = await evaluator.evaluate("user.role == 'admin'", context);
    expect(result).toBe(true);
  });

  it('should evaluate inequality', async () => {
    const context = { user: { role: 'user' } };
    const result = await evaluator.evaluate("user.role != 'admin'", context);
    expect(result).toBe(true);
  });

  it('should evaluate AND logic', async () => {
    const context = { user: { role: 'admin', active: true } };
    const result = await evaluator.evaluate("user.role == 'admin' AND user.active == true", context);
    expect(result).toBe(true);
  });

  it('should evaluate OR logic', async () => {
    const context = { user: { role: 'user' } };
    const result = await evaluator.evaluate("user.role == 'admin' OR user.role == 'user'", context);
    expect(result).toBe(true);
  });

  it('should evaluate NOT logic', async () => {
    const context = { user: { role: 'user' } };
    const result = await evaluator.evaluate("NOT user.role == 'admin'", context);
    expect(result).toBe(true);
  });

  it('should evaluate number comparisons', async () => {
    const context = { data: { priority: 5 } };
    const result = await evaluator.evaluate('data.priority > 3', context);
    expect(result).toBe(true);
  });

  it('should handle parentheses', async () => {
    const context = { user: { role: 'user' }, data: { public: true } };
    const result = await evaluator.evaluate("(user.role == 'user' AND data.public == true) OR user.role == 'admin'", context);
    expect(result).toBe(true);
  });

  it('should resolve nested properties', async () => {
    const context = { user: { profile: { role: 'admin' } } };
    const result = await evaluator.evaluate("user.profile.role == 'admin'", context);
    expect(result).toBe(true);
  });

  it('should handle undefined properties gracefully', async () => {
    const context = { user: { role: 'admin' } };
    const result = await evaluator.evaluate("user.nonexistent == 'value'", context);
    expect(result).toBe(false);
  });
});

describe('PolicyEngine', () => {
  let engine;
  let registry;

  beforeEach(() => {
    registry = new MetadataRegistry(null);
    engine = new PolicyEngine(registry);
  });

  it('should allow when no policies exist', async () => {
    const result = await engine.evaluate({
      resource: 'ticket',
      action: 'read',
      user: { userId: 'user1', roles: ['user'], permissions: [] },
    });

    expect(result.allowed).toBe(true);
  });

  it('should deny based on ABAC rule', async () => {
    const policy = {
      resource: 'ticket',
      action: 'read',
      rule: "user.role == 'manager'",
    };

    await registry.registerPermission(policy);

    const result = await engine.evaluate({
      resource: 'ticket',
      action: 'read',
      user: { userId: 'user1', roles: ['agent'], permissions: [] },
      data: {},
    });

    expect(result.allowed).toBe(false);
  });

  it('should allow based on ABAC rule', async () => {
    const policy = {
      resource: 'ticket',
      action: 'read',
      rule: "user.role == 'agent' OR user.role == 'manager'",
    };

    await registry.registerPermission(policy);

    const result = await engine.evaluate({
      resource: 'ticket',
      action: 'read',
      user: { userId: 'user1', roles: ['agent'], permissions: [] },
      data: {},
    });

    expect(result.allowed).toBe(true);
  });

  it('should enforce field-level permissions', async () => {
    const policy = {
      resource: 'ticket',
      action: 'update',
      fieldLevel: {
        status: "user.role == 'manager'",
        notes: "true",
      },
    };

    await registry.registerPermission(policy);

    const result = await engine.evaluate({
      resource: 'ticket',
      action: 'update',
      user: { userId: 'user1', roles: ['agent'], permissions: [] },
      data: {},
    });

    expect(result.allowed).toBe(true);
    expect(result.fieldFilters.status).toBe(false);
    expect(result.fieldFilters.notes).toBe(true);
  });

  it('should check hasPermission convenience method', async () => {
    const policy = {
      resource: 'ticket',
      action: 'create',
      rule: "user.role == 'agent'",
    };

    await registry.registerPermission(policy);

    const allowed = await engine.hasPermission(
      'ticket',
      'create',
      { userId: 'user1', roles: ['agent'] }
    );

    expect(allowed).toBe(true);
  });

  it('should handle multiple policies (all must pass)', async () => {
    await registry.registerPermission({
      resource: 'ticket',
      action: 'create',
      rule: "user.role != 'guest'",
    });

    await registry.registerPermission({
      resource: 'ticket',
      action: 'create',
      rule: "user.active == true",
    });

    // First policy fails
    let result = await engine.evaluate({
      resource: 'ticket',
      action: 'create',
      user: { userId: 'user1', roles: ['guest'], active: true },
      data: { active: true },
    });

    expect(result.allowed).toBe(false);

    // Second policy fails
    result = await engine.evaluate({
      resource: 'ticket',
      action: 'create',
      user: { userId: 'user1', roles: ['agent'], active: false },
      data: { active: false },
    });

    expect(result.allowed).toBe(false);

    // Both policies pass
    result = await engine.evaluate({
      resource: 'ticket',
      action: 'create',
      user: { userId: 'user1', roles: ['agent'], active: true },
      data: { active: true },
    });

    expect(result.allowed).toBe(true);
  });
});
