const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export default defineEventHandler((event) => {
  const enabled = process.env.RATE_LIMITING_ENABLED !== 'false';
  if (!enabled) return;

  // Only rate-limit API routes
  const path = getRequestURL(event).pathname;
  if (!path.startsWith('/api/')) return;

  const ip = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getHeader(event, 'x-real-ip')
    || 'unknown';

  const windowMs = 60_000; // 1 minute
  const maxRequests = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60');
  const now = Date.now();

  let entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(ip, entry);
  }

  entry.count++;

  setResponseHeaders(event, {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(Math.max(0, maxRequests - entry.count)),
    'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
  });

  if (entry.count > maxRequests) {
    setResponseStatus(event, 429);
    return {
      success: false,
      message: 'Too many requests. Please try again later.',
    };
  }

  // Cleanup old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, val] of rateLimitStore) {
      if (now > val.resetAt) rateLimitStore.delete(key);
    }
  }
});
