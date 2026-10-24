import { keyPrefixFromHeader, rateLimitKey, clearQuotaCache, DEFAULT_MAX } from '../../src/core/services/api-quota.js';

describe('API key quotas (F6.3)', () => {
  test('extracts key prefixes without leaking secrets', () => {
    expect(keyPrefixFromHeader('Bearer lume_abcdefgh1234567890')).toBe('lume_abcdefgh');
    expect(keyPrefixFromHeader('Bearer eyJhbGciOiJIUzI1NiJ9')).toBeNull();
    expect(keyPrefixFromHeader('Bearer short')).toBeNull();
    expect(keyPrefixFromHeader(null)).toBeNull();
    expect(keyPrefixFromHeader(undefined)).toBeNull();
  });

  test('buckets API keys separately from IPs', () => {
    expect(rateLimitKey({ headers: { authorization: 'Bearer lume_abcdefgh1234567890' }, ip: '1.2.3.4' }))
      .toBe('apikey:lume_abcdefgh');
    expect(rateLimitKey({ headers: {}, ip: '1.2.3.4' })).toBe('1.2.3.4');
    expect(rateLimitKey({ headers: {} })).toBe('unknown-ip');
  });

  test('default quota is sane', () => {
    expect(DEFAULT_MAX).toBe(100);
    clearQuotaCache();
  });
});
