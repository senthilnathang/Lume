import { requireScopes } from '../../src/core/middleware/auth.js';

function run(mw, user) {
  return new Promise((resolve) => {
    const req = { user };
    const res = {
      status: (code) => ({ json: (body) => resolve({ code, body }) }),
    };
    const next = () => resolve({ next: true });
    mw(req, res, next);
  });
}

describe('API key scope enforcement (F4.2)', () => {
  const keyUser = (scopes) => ({ authMethod: 'api_key', apiKeyScopes: scopes });

  test('passes JWT callers and empty requirements through', async () => {
    expect(await run(requireScopes('records:write'), { authMethod: 'bearer' })).toEqual({ next: true });
    expect(await run(requireScopes(), keyUser(['x']))).toEqual({ next: true });
  });

  test('legacy keys without scopes keep full access', async () => {
    expect(await run(requireScopes('records:write'), keyUser([]))).toEqual({ next: true });
    expect(await run(requireScopes('records:write'), keyUser(null))).toEqual({ next: true });
  });

  test('enforces exact and wildcard scopes', async () => {
    expect(await run(requireScopes('records:write'), keyUser(['records:write']))).toEqual({ next: true });
    expect(await run(requireScopes('records:write'), keyUser(['records:*']))).toEqual({ next: true });
    expect(await run(requireScopes('records:write'), keyUser(['*:write']))).toEqual({ next: true });
    expect(await run(requireScopes('records:write'), keyUser(['*']))).toEqual({ next: true });
    const denied = await run(requireScopes('records:write'), keyUser(['records:read']));
    expect(denied.code).toBe(403);
  });

  test('rejects unauthenticated requests', async () => {
    expect((await run(requireScopes('records:read'), null)).code).toBe(401);
  });
});
