import { isSsoConfigured, buildServiceProvider } from '../../src/core/services/sso.service.js';

async function withEnv(vars, fn) {
  const prev = {};
  for (const [key, value] of Object.entries(vars)) {
    prev[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe('sso service (F7.3)', () => {
  test('reports unconfigured without env', async () => {
    await withEnv({ SSO_ENTITY_ID: undefined, SSO_ASSERTION_URL: undefined }, async () => {
      const { isSsoConfigured } = await import('../../src/core/services/sso.service.js?nocache=1');
      expect(isSsoConfigured()).toBe(false);
    });
    expect(isSsoConfigured()).toBe(false);
  });

  test('builds SP metadata from env', async () => {
    await withEnv(
      { SSO_ENTITY_ID: 'https://app/sp', SSO_ASSERTION_URL: 'https://app/acs' },
      async () => {
        const xml = buildServiceProvider().getMetadata();
        expect(xml).toMatch(/EntityDescriptor/);
        expect(xml).toMatch(/https:\/\/app\/acs/);
      }
    );
  });

  test('rejects SP build without config', async () => {
    await withEnv({ SSO_ENTITY_ID: undefined, SSO_ASSERTION_URL: undefined }, async () => {
      expect(() => buildServiceProvider()).toThrow(/not configured/);
    });
  });
});
