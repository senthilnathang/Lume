import prisma from '../db/prisma.js';

export const DEFAULT_MAX = 100;
const CACHE_TTL_MS = 60 * 1000;

const quotaCache = new Map();

export function keyPrefixFromHeader(authHeader) {
  if (typeof authHeader !== 'string') {
    return null;
  }
  const match = authHeader.match(/^Bearer\s+(lume_[A-Za-z0-9]{8})[A-Za-z0-9]*$/);
  return match ? match[1] : null;
}

export function rateLimitKey(req) {
  const prefix = keyPrefixFromHeader(req.headers?.authorization || req.headers?.Authorization);
  if (prefix) {
    return `apikey:${prefix}`;
  }
  return req.ip || 'unknown-ip';
}

async function readQuotaSetting(prefix) {
  try {
    const row = await prisma.setting.findFirst({ where: { key: `apiquota.${prefix}` } });
    const value = Number(row?.value);
    if (Number.isFinite(value) && value > 0) {
      return Math.min(Math.trunc(value), 100000);
    }
  } catch {
    /* fall through to default */
  }
  return DEFAULT_MAX;
}

export async function quotaForRequest(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  const prefix = keyPrefixFromHeader(auth);
  if (!prefix) {
    return DEFAULT_MAX;
  }
  const now = Date.now();
  const cached = quotaCache.get(prefix);
  if (cached && cached.expiresAt > now) {
    return cached.max;
  }
  const max = await readQuotaSetting(prefix);
  quotaCache.set(prefix, { max, expiresAt: now + CACHE_TTL_MS });
  return max;
}

export function clearQuotaCache() {
  quotaCache.clear();
}

export default { keyPrefixFromHeader, rateLimitKey, quotaForRequest, clearQuotaCache, DEFAULT_MAX };
