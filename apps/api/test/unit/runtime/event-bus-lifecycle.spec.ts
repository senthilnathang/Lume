import { jest } from '@jest/globals';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService, LumeEvent } from '../../../src/core/runtime/event-bus.service';

describe('framework event subscription lifecycle', () => {
  let bus: EventBusService;
  const event: LumeEvent = { type: 'test', source: 'test', timestamp: new Date(), data: {} };
  beforeEach(() => { bus = new EventBusService(new EventEmitter2()); });
  it('removes the registered wrapper using the original handler', () => {
    const handler = jest.fn();
    bus.on('test', handler); bus.emit(event);
    bus.removeListener('test', handler); bus.emit(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('test')).toBe(0);
  });
  it('removes only one duplicate subscription at a time', () => {
    const handler = jest.fn();
    bus.on('test', handler); bus.on('test', handler);
    bus.removeListener('test', handler); bus.emit(event);
    expect(handler).toHaveBeenCalledTimes(1);
    bus.removeListener('test', handler);
    expect(bus.listenerCount('test')).toBe(0);
  });
  it('can cancel a once listener and reuse its handler afterwards', () => {
    const handler = jest.fn();
    bus.once('test', handler); bus.removeListener('test', handler); bus.emit(event);
    expect(handler).not.toHaveBeenCalled();
    bus.once('test', handler); bus.emit(event); bus.emit(event);
    expect(handler).toHaveBeenCalledTimes(1);
    bus.on('test', handler); bus.removeListener('test', handler);
    expect(bus.listenerCount('test')).toBe(0);
  });
  it('keeps other event subscriptions when clearing one event', () => {
    const handler = jest.fn();
    bus.on('test', handler); bus.on('other', handler);
    bus.removeAllListeners('test'); bus.emit(event); bus.emit({ ...event, type: 'other' });
    expect(handler).toHaveBeenCalledTimes(1);
    bus.removeAllListeners();
    expect(bus.listenerCount('other')).toBe(0);
  });
  it('contains synchronous and asynchronous handler failures', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      bus.on('test', () => { throw new Error('sync'); });
      bus.once('test', async () => { throw new Error('async'); });
      expect(() => bus.emit(event)).not.toThrow();
      await Promise.resolve();
      expect(log).toHaveBeenCalledTimes(2);
    } finally { log.mockRestore(); }
  });
});
