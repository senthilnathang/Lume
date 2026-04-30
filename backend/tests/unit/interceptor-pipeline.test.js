/**
 * @fileoverview Unit tests for InterceptorPipeline
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import InterceptorPipeline from '../../src/core/runtime/interceptor-pipeline.js';

describe('InterceptorPipeline', () => {
  let pipeline;

  beforeEach(() => {
    pipeline = new InterceptorPipeline();
  });

  it('should initialize empty', () => {
    expect(pipeline.interceptors.size).toBe(0);
  });

  it('should register an interceptor', () => {
    const processFn = async () => ({});

    pipeline.register('test', 10, processFn);

    expect(pipeline.interceptors.size).toBe(1);
    expect(pipeline.getInterceptor('test')).toBeDefined();
  });

  it('should validate order is multiple of 10', () => {
    const processFn = async () => ({});

    expect(() => {
      pipeline.register('test', 5, processFn);
    }).toThrow();

    expect(() => {
      pipeline.register('test', 90, processFn);
    }).toThrow();
  });

  it('should execute interceptors in order', async () => {
    const order = [];

    const fn1 = async () => {
      order.push(1);
      return { stateUpdate: { stage1: true } };
    };

    const fn2 = async () => {
      order.push(2);
      return { stateUpdate: { stage2: true } };
    };

    const fn3 = async () => {
      order.push(3);
      return { stateUpdate: { stage3: true } };
    };

    pipeline.register('first', 10, fn1);
    pipeline.register('second', 20, fn2);
    pipeline.register('third', 30, fn3);

    const context = await pipeline.execute(
      { entity: 'test', action: 'read' },
      { slug: 'test', fields: [] },
      { userId: 'user1' }
    );

    expect(order).toEqual([1, 2, 3]);
    expect(context.state.stage1).toBe(true);
    expect(context.state.stage2).toBe(true);
    expect(context.state.stage3).toBe(true);
  });

  it('should abort pipeline when interceptor returns abort', async () => {
    const order = [];

    const fn1 = async () => {
      order.push(1);
      return { stateUpdate: { stage1: true } };
    };

    const fn2 = async () => {
      order.push(2);
      return {
        abort: true,
        abortReason: 'Permission denied',
        stateUpdate: { stage2: true },
      };
    };

    const fn3 = async () => {
      order.push(3);
      return { stateUpdate: { stage3: true } };
    };

    pipeline.register('first', 10, fn1);
    pipeline.register('second', 20, fn2);
    pipeline.register('third', 30, fn3);

    const context = await pipeline.execute(
      { entity: 'test', action: 'read' },
      { slug: 'test', fields: [] },
      { userId: 'user1' }
    );

    expect(order).toEqual([1, 2]); // fn3 should not execute
    expect(context.aborted).toBe(true);
    expect(context.abortReason).toBe('Permission denied');
    expect(context.abortAt).toBe(20);
  });

  it('should track interceptors run', async () => {
    const fn1 = async () => ({ stateUpdate: {} });
    const fn2 = async () => ({ stateUpdate: {} });

    pipeline.register('auth', 10, fn1);
    pipeline.register('permission', 20, fn2);

    const context = await pipeline.execute(
      { entity: 'test', action: 'read' },
      { slug: 'test', fields: [] },
      { userId: 'user1' }
    );

    expect(context.interceptorsRun).toContain('auth');
    expect(context.interceptorsRun).toContain('permission');
  });

  it('should skip disabled interceptors', async () => {
    const order = [];

    const fn1 = async () => {
      order.push(1);
      return {};
    };

    const fn2 = async () => {
      order.push(2);
      return {};
    };

    const fn3 = async () => {
      order.push(3);
      return {};
    };

    pipeline.register('first', 10, fn1);
    pipeline.register('second', 20, fn2, false); // disabled
    pipeline.register('third', 30, fn3);

    const context = await pipeline.execute(
      { entity: 'test', action: 'read' },
      { slug: 'test', fields: [] },
      { userId: 'user1' }
    );

    expect(order).toEqual([1, 3]); // fn2 skipped
    expect(context.interceptorsRun).not.toContain('second');
  });

  it('should track permission checks', async () => {
    const fn1 = async () => ({
      permissionChecks: [
        { check: 'authentication', allowed: true },
      ],
    });

    pipeline.register('auth', 10, fn1);

    const context = await pipeline.execute(
      { entity: 'test', action: 'read' },
      { slug: 'test', fields: [] },
      { userId: 'user1' }
    );

    expect(context.permissionChecks).toHaveLength(1);
    expect(context.permissionChecks[0].check).toBe('authentication');
  });

  it('should calculate execution duration', async () => {
    const fn1 = async () => {
      // Small delay
      return new Promise(resolve => setTimeout(() => resolve({}), 10));
    };

    pipeline.register('slow', 10, fn1);

    const context = await pipeline.execute(
      { entity: 'test', action: 'read' },
      { slug: 'test', fields: [] },
      { userId: 'user1' }
    );

    expect(context.duration).toBeGreaterThanOrEqual(10);
  });

  it('should enable/disable interceptor', () => {
    const fn = async () => ({});

    pipeline.register('test', 10, fn);

    let interceptor = pipeline.getInterceptor('test');
    expect(interceptor.enabled).toBe(true);

    pipeline.setEnabled('test', false);

    interceptor = pipeline.getInterceptor('test');
    expect(interceptor.enabled).toBe(false);
  });

  it('should list interceptors in order', () => {
    pipeline.register('auth', 10, async () => ({}));
    pipeline.register('permission', 20, async () => ({}));
    pipeline.register('validate', 30, async () => ({}));

    const list = pipeline.listInterceptors();

    expect(list).toContain('[10] auth');
    expect(list).toContain('[20] permission');
    expect(list).toContain('[30] validate');
  });
});
