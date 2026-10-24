import { jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MetadataRegistryService } from '../../../src/core/runtime/metadata-registry.service';
import { EventBusService, BuiltInEvents } from '../../../src/core/runtime/event-bus.service';
import { ExecutionPipelineService } from '../../../src/core/runtime/execution-pipeline.service';
import { WorkflowExecutorService, WorkflowActionType } from '../../../src/core/workflow/workflow-executor.service';

const types: WorkflowActionType[] = ['send_notification', 'call_webhook', 'create_record', 'ai'];
function setup(type: WorkflowActionType, onError?: 'stop') {
  const registry = new MetadataRegistryService();
  registry.registerWorkflow({ name: 'action', entity: 'deal', trigger: { type: 'manual', key: 'action' }, onError,
    steps: [{ type } as any, { type: 'set_field', field: 'status', value: 'done' }] });
  const events = new EventBusService(new EventEmitter2());
  const completed = jest.fn(), failed = jest.fn();
  events.on(BuiltInEvents.WORKFLOW_COMPLETED, completed);
  events.on(BuiltInEvents.WORKFLOW_FAILED, failed);
  const service = new WorkflowExecutorService(registry, events, new ExecutionPipelineService(), null!);
  const record = { id: 1, status: 'draft' };
  return { service, record, completed, failed,
    execute: () => service.execute('action', record, 'deal', { type: 'manual' }, 7) };
}

describe('Workflow action adapters', () => {
  it.each(types)('fails visibly when %s has no adapter', async type => {
    const h = setup(type);
    const run = await h.execute();
    expect(run.status).toBe('failed');
    expect(run.stepsLog).toEqual([{ stepIndex: 0, stepType: type, error: `Workflow action '${type}' is not configured` }]);
    expect(h.record.status).toBe('draft');
    expect(h.completed).not.toHaveBeenCalled();
    expect(h.failed).toHaveBeenCalledTimes(1);
  });

  it.each(types)('awaits the real %s adapter and records its receipt', async type => {
    const h = setup(type);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const receipt = { operationId: 'real-operation' };
    const adapter = jest.fn(async (ctx: any, step: any) => {
      expect(ctx.record).toBe(h.record);
      expect(ctx.userId).toBe(7);
      expect(step.type).toBe(type);
      await gate;
      return receipt;
    });
    h.service.registerActionHandler(type, adapter);
    const pending = h.execute();
    expect(h.completed).not.toHaveBeenCalled();
    expect(h.record.status).toBe('draft');
    release();
    const run = await pending;
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(run.status).toBe('completed');
    expect(run.stepsLog[0].result).toBe(receipt);
    expect(h.record.status).toBe('done');
    expect(h.completed).toHaveBeenCalledTimes(1);
  });

  it.each(types)('records a real %s failure and prevents later steps', async type => {
    const h = setup(type);
    h.service.registerActionHandler(type, async () => { throw new Error('Adapter unavailable'); });
    const run = await h.execute();
    expect(run.status).toBe('failed');
    expect(run.stepsLog).toEqual([{ stepIndex: 0, stepType: type, error: 'Adapter unavailable' }]);
    expect(h.record.status).toBe('draft');
    expect(h.completed).not.toHaveBeenCalled();
    expect(h.failed).toHaveBeenCalledTimes(1);
  });

  it('propagates failure when the workflow requests stop semantics', async () => {
    const h = setup('call_webhook', 'stop');
    await expect(h.execute()).rejects.toThrow('is not configured');
    expect(h.failed).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported adapter registrations', () => {
    const h = setup('ai');
    expect(() => h.service.registerActionHandler('custom' as any, async () => {})).toThrow('supported');
    expect(() => h.service.registerActionHandler('ai', null as any)).toThrow('callable');
  });
});
