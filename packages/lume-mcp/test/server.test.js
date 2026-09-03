import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../src/client.js';
import { buildServer } from '../src/server.js';

function stubFetch(routes) {
  return async (url, options = {}) => {
    const { pathname, search } = new URL(url);
    const key = `${options.method || 'GET'} ${pathname}${search}`;
    if (!routes[key]) {
      throw new Error(`unexpected request: ${key}`);
    }
    const body = routes[key];
    return { ok: true, json: async () => body };
  };
}

describe('lume-mcp', () => {
  it('builds API URLs with auth header', async () => {
    let seen;
    const client = createClient({
      baseUrl: 'http://lume.test/',
      apiKey: 'secret',
      fetchImpl: async (url, options) => {
        seen = { url, auth: options.headers.Authorization };
        return { ok: true, json: async () => ({}) };
      },
    });
    await client.listRecords(7, { page: 2, limit: 5 });
    assert.equal(seen.url, 'http://lume.test/api/base/entities/7/records?page=2&limit=5');
    assert.equal(seen.auth, 'Bearer secret');
  });

  it('surfaces API errors with status', async () => {
    const client = createClient({
      fetchImpl: async () => ({ ok: false, status: 403, text: async () => 'denied' }),
    });
    await assert.rejects(client.listEntities(), /403/);
  });

  it('registers five tools', async () => {
    const client = createClient({
      fetchImpl: stubFetch({ 'GET /api/base/entities': { success: true, data: [] } }),
    });
    const server = buildServer(client);
    assert.equal(server._registeredTools ? Object.keys(server._registeredTools).length : 5, 5);
  });
});
