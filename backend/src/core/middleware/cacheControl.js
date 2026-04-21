// Response caching middleware with smart TTL based on routes
import redis from 'ioredis';

const client = process.env.REDIS_URL ? new redis(process.env.REDIS_URL) : null;

export const getCacheKey = (req) => {
  return `cache:${req.method}:${req.path}:${JSON.stringify(req.query)}`;
};

// Cache configuration by route pattern
const cachePatterns = {
  // Settings, menus, permissions change infrequently
  '/api/website/public/menus': 3600, // 1 hour
  '/api/website/public/settings': 3600, // 1 hour
  '/api/base/permissions': 1800, // 30 minutes
  '/api/base/roles': 1800,
  '/api/modules': 1800,

  // Editor templates rarely change
  '/api/editor/templates': 3600,
  '/api/editor/snippets': 3600,

  // Pages change less frequently
  '/api/website/public/pages': 1800, // 30 minutes

  // User data - don't cache or short cache
  '/api/users': 0,
  '/api/base/users': 0,
};

const getCacheTTL = (path) => {
  for (const [pattern, ttl] of Object.entries(cachePatterns)) {
    if (path.startsWith(pattern)) {
      return ttl;
    }
  }
  return 0; // No caching by default
};

export const responseCache = async (req, res, next) => {
  if (!client || req.method !== 'GET') {
    return next();
  }

  const ttl = getCacheTTL(req.path);
  if (ttl === 0) {
    return next();
  }

  const cacheKey = getCacheKey(req);

  try {
    const cached = await client.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function (data) {
      if (res.statusCode === 200) {
        client.setex(cacheKey, ttl, JSON.stringify(data)).catch(err => {
          console.error('Cache set error:', err.message);
        });
      }
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  } catch (err) {
    console.error('Cache check error:', err.message);
    next();
  }
};

export const clearCache = async (pattern) => {
  if (!client) return;

  try {
    const keys = await client.keys(`cache:*${pattern}*`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    console.error('Cache clear error:', err.message);
  }
};

export const clearCacheForRoute = async (method, path) => {
  if (!client) return;

  try {
    const keys = await client.keys(`cache:${method}:${path}:*`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    console.error('Cache clear error:', err.message);
  }
};
