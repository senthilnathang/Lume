import { jest } from '@jest/globals';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ThrottlerStorageService, ThrottlerException } from '@nestjs/throttler';
import { TransportThrottlerGuard } from '../../../src/core/guards/transport-throttler.guard';

describe('global transport throttling', () => {
  class Handler { query() {} }
  let guard: TransportThrottlerGuard, storage: ThrottlerStorageService;
  beforeEach(async () => {
    storage = new ThrottlerStorageService();
    guard = new TransportThrottlerGuard([{ ttl: 60000, limit: 2 }], storage, new Reflector());
    await guard.onModuleInit();
  });
  afterEach(() => storage.onApplicationShutdown());
  const context = (transport: string, address = '127.0.0.1') => {
    const res = { header: jest.fn() };
    const req = transport === 'websocket' ? { headers: {}, socket: { remoteAddress: address } }
      : { headers: {}, ip: address, res };
    const ctx = new ExecutionContextHost(transport === 'http' ? [req, res] : [undefined, {}, { req }, {}], Handler, Handler.prototype.query);
    ctx.setType(transport === 'http' ? 'http' : 'graphql');
    return { ctx, res };
  };
  it.each(['http', 'graphql', 'websocket'])('enforces real limits and separates client addresses: %s', async transport => {
    const { ctx, res } = context(transport);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ThrottlerException);
    await expect(guard.canActivate(context(transport, '127.0.0.2').ctx)).resolves.toBe(true);
    if (transport !== 'websocket') expect(res.header).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });
  it('rejects a missing GraphQL request rather than bypassing limits', async () => {
    const ctx = new ExecutionContextHost([undefined, {}, {}, {}], Handler, Handler.prototype.query);
    ctx.setType('graphql');
    await expect(guard.canActivate(ctx)).rejects.toThrow('Request context required');
  });
});
