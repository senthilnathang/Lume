import { jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExecutionPipelineService } from '../../../src/core/runtime/execution-pipeline.service';
import { MetadataRegistryService } from '../../../src/core/runtime/metadata-registry.service';
import { PolicyEvaluatorService } from '../../../src/core/permission/policy-evaluator.service';
import { EventBusService, BuiltInEvents } from '../../../src/core/runtime/event-bus.service';
import { WorkflowExecutorService } from '../../../src/core/workflow/workflow-executor.service';
import { integer, doublePrecision, table } from '../../../src/core/db/dialect';
import { getTableConfig } from 'drizzle-orm/mysql-core';

// These tests require no database and exercise the actual framework services.
describe('Execution pipeline contracts', () => {
  it('wraps the terminal handler in registration order and forwards its result', async () => {
    const pipeline = new ExecutionPipelineService();
    const order: string[] = [];
    const context = { entityName: 'deal', operation: 'create' as const, data: { validated: false } };
    pipeline.use(async (ctx, next) => {
      expect(ctx).toBe(context);
      order.push('before');
      ctx.data.validated = true;
      const result = await next();
      order.push('after');
      return result;
    });
    const handler = jest.fn(async () => {
      order.push('handler');
      return context.data;
    });
    await expect(pipeline.execute(context, handler)).resolves.toEqual({ validated: true });
    expect(order).toEqual(['before', 'handler', 'after']);
    expect(handler).toHaveBeenCalledWith();
  });

  it('rejects double next calls without executing the handler twice', async () => {
    const pipeline = new ExecutionPipelineService();
    const handler = jest.fn(async () => 1);
    pipeline.use(async (_ctx, next) => { await next(); return next(); });
    await expect(pipeline.execute({ entityName: 'deal', operation: 'read' }, handler))
      .rejects.toThrow('next() called multiple times');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('allows middleware to short-circuit and preserves handler errors', async () => {
    const pipeline = new ExecutionPipelineService();
    const handler = jest.fn(async () => { throw new Error('storage unavailable'); });
    pipeline.use(async () => 'cached');
    await expect(pipeline.execute({ entityName: 'deal', operation: 'read' }, handler)).resolves.toBe('cached');
    expect(handler).not.toHaveBeenCalled();
    pipeline.clear();
    await expect(pipeline.execute({ entityName: 'deal', operation: 'read' }, handler))
      .rejects.toThrow('storage unavailable');
  });
});

describe('Policy authorization', () => {
  let registry: MetadataRegistryService;
  let policies: PolicyEvaluatorService;
  beforeEach(() => {
    registry = new MetadataRegistryService();
    policies = new PolicyEvaluatorService(registry);
  });

  it('denies access when no policy matches', async () => {
    await expect(policies.canRead('deal', {})).resolves.toBe(false);
  });

  it('lets a matching explicit deny override an allow', async () => {
    registry.registerPolicy({ name: 'allow', entity: 'deal', actions: ['*'] });
    registry.registerPolicy({ name: 'deny', entity: 'deal', actions: ['read'], deny: true });
    await expect(policies.canRead('deal', {})).resolves.toBe(false);
    await expect(policies.canCreate('deal', {})).resolves.toBe(true);
  });

  it('applies deny policies only when their role and record conditions match', async () => {
    registry.registerPolicy({ name: 'allow', entity: 'deal', actions: ['read'] });
    registry.registerPolicy({
      name: 'deny', entity: 'deal', actions: ['read'], deny: true, roles: ['restricted'],
      conditions: [{ field: 'ownerId', operator: '==', value: '$userId' }],
    });
    await expect(policies.canRead('deal', { userId: 1, userRoles: ['restricted'] }, { ownerId: 1 })).resolves.toBe(false);
    await expect(policies.canRead('deal', { userId: 2, userRoles: ['restricted'] }, { ownerId: 1 })).resolves.toBe(true);
    await expect(policies.canRead('deal', { userId: 1, userRoles: ['admin'] }, { ownerId: 1 })).resolves.toBe(true);
  });

  it('uses write permissions for updates, including wildcard denies', async () => {
    registry.registerPolicy({ name: 'writer', entity: 'deal', actions: ['write'], roles: ['editor'] });
    await expect(policies.canUpdate('deal', { userRoles: ['editor'] })).resolves.toBe(true);
    await expect(policies.canUpdate('deal', { userRoles: ['viewer'] })).resolves.toBe(false);
    registry.registerPolicy({ name: 'blocked', entity: 'deal', actions: ['*'], deny: true });
    await expect(policies.canUpdate('deal', { userRoles: ['editor'] })).resolves.toBe(false);
  });
});

describe('Metadata and dialect contracts', () => {
  it('merges ordered extensions without mutating base definitions', () => {
    const registry = new MetadataRegistryService();
    const originalHook = async () => {};
    const latestHook = async () => {};
    const base = { name: 'deal', label: 'Deal', fields: { title: { name: 'title', type: 'text' } }, hooks: { afterCreate: originalHook } };
    registry.registerEntity(base);
    registry.extendEntity('deal', { fields: { amount: { name: 'amount', type: 'number' } } });
    registry.extendEntity('deal', { fields: { title: { name: 'title', type: 'text', required: true } }, hooks: { afterCreate: latestHook } });
    registry.extendEntity('deal', {});
    expect(registry.getEntityWithExtensions('deal')).toMatchObject({
      fields: { title: { required: true }, amount: { type: 'number' } }, hooks: { afterCreate: latestHook },
    });
    expect(registry.getEntity('deal')).toBe(base);
    expect(base.fields.title).not.toHaveProperty('required');
    expect(base.hooks.afterCreate).toBe(originalHook);
  });

  it('creates valid MySQL columns for portable integer and double aliases', () => {
    const definition = table('test_measurement', { id: integer('id'), amount: doublePrecision('amount') });
    expect(getTableConfig(definition).columns.map(column => column.getSQLType())).toEqual(['int', 'double']);
  });
});

describe('Workflow execution records', () => {
  it.each([['new','then'],['closed','else']])('evaluates condition operands for status %s',async(status,expected)=>{
    const registry=new MetadataRegistryService();
    registry.registerWorkflow({name:'condition',entity:'deal',trigger:{type:'manual',key:'test'},steps:[
      {type:'condition',if:{field:'status',operator:'==',value:'new'},then:[{type:'set_field',field:'branch',value:'then'}],else:[{type:'set_field',field:'branch',value:'else'}]},
    ]});
    const service=new WorkflowExecutorService(registry,new EventBusService(new EventEmitter2()),new ExecutionPipelineService(),null!);
    const record:any={id:1,status};await service.execute('condition',record,'deal',{type:'manual'});
    expect(record.branch).toBe(expected);
  });
  it('records each condition once and retains nested step results', async () => {
    const registry = new MetadataRegistryService();
    registry.registerWorkflow({ name: 'test', entity: 'deal', trigger: { type: 'manual', key: 'test' }, steps: [
      { type: 'condition', if: {}, then: [{ type: 'set_field', field: 'status', value: 'review' }] },
    ] });
    const events = new EventBusService(new EventEmitter2());
    const completed = jest.fn();
    events.on(BuiltInEvents.WORKFLOW_COMPLETED, completed);
    const service = new WorkflowExecutorService(registry, events, new ExecutionPipelineService(), null!);
    const record = { id: 1, status: 'draft' };
    const run = await service.execute('test', record, 'deal', { type: 'manual' });
    expect(run.status).toBe('completed');
    expect(record.status).toBe('review');
    expect(run.stepsLog).toEqual([
      { stepIndex: 0, stepType: 'set_field', result: { field: 'status', value: 'review' } },
      { stepIndex: 0, stepType: 'condition', result: { condition: true } },
    ]);
    expect(completed).toHaveBeenCalledTimes(1);
  });

  it('retains the failed step and stops before later actions', async () => {
    const registry = new MetadataRegistryService();
    registry.registerWorkflow({ name: 'test', entity: 'deal', trigger: { type: 'manual', key: 'test' }, steps: [
      { type: 'custom', handler: 'missing' }, { type: 'set_field', field: 'status', value: 'done' },
    ] });
    const service = new WorkflowExecutorService(registry, new EventBusService(new EventEmitter2()), new ExecutionPipelineService(), null!);
    const record = { id: 1, status: 'draft' };
    const run = await service.execute('test', record, 'deal', { type: 'manual' });
    expect(run.status).toBe('failed');
    expect(run.stepsLog).toEqual([{ stepIndex: 0, stepType: 'custom', error: "Custom handler 'missing' not registered" }]);
    expect(record.status).toBe('draft');
  });
});
