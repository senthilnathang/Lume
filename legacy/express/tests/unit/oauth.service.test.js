import {
  isProviderConfigured, configuredProviders, buildAuthorizeUrl, newState,
  exchangeCode, fetchProfile,
} from '../../src/core/services/oauth.service.js';

describe('oauth service (F7.2)', () => {
  const prev = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('OAUTH_') && !(key in prev)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, Object.fromEntries(Object.entries(prev).filter(([k]) => k.startsWith('OAUTH_'))));
  });

  test('detects configured providers from env', () => {
    delete process.env.OAUTH_GITHUB_CLIENT_ID;
    expect(isProviderConfigured('github')).toBe(false);
    expect(isProviderConfigured('nope')).toBe(false);
    process.env.OAUTH_GITHUB_CLIENT_ID = 'id';
    process.env.OAUTH_GITHUB_CLIENT_SECRET = 'secret';
    process.env.OAUTH_GITHUB_REDIRECT_URI = 'https://app/cb';
    expect(isProviderConfigured('github')).toBe(true);
    expect(configuredProviders()).toContain('github');
  });

  test('builds authorize URLs with state', () => {
    process.env.OAUTH_GOOGLE_CLIENT_ID = 'id';
    process.env.OAUTH_GOOGLE_CLIENT_SECRET = 's';
    process.env.OAUTH_GOOGLE_REDIRECT_URI = 'https://app/cb';
    const state = newState();
    expect(state).toHaveLength(32);
    const url = buildAuthorizeUrl('google', state);
    expect(url).toMatch(/^https:\/\/accounts\.google\.com\/.*state=/);
    expect(() => buildAuthorizeUrl('nope', state)).toThrow(/Unknown/);
  });

  test('exchanges codes and fetches profiles with stubs', async () => {
    process.env.OAUTH_GITHUB_CLIENT_ID = 'id';
    process.env.OAUTH_GITHUB_CLIENT_SECRET = 's';
    process.env.OAUTH_GITHUB_REDIRECT_URI = 'https://app/cb';
    const fetchImpl = async (url) => {
      if (String(url).includes('/login/oauth/access_token')) {
        return { ok: true, json: async () => ({ access_token: 'tok123' }) };
      }
      if (String(url).endsWith('/user/emails')) {
        return { ok: true, json: async () => [{ email: 'g@x.com', primary: true }] };
      }
      return { ok: true, json: async () => ({ id: 7, login: 'guser' }) };
    };
    expect(await exchangeCode('github', 'code123', fetchImpl)).toBe('tok123');
    const profile = await fetchProfile('github', 'tok123', fetchImpl);
    expect(profile).toMatchObject({ email: 'g@x.com', firstName: 'guser' });
    await expect(exchangeCode('github', 'bad', async () => ({ ok: false, status: 400 })))
      .rejects.toThrow(/exchange failed/);
  });
});
