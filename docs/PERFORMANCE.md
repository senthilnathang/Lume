# Lume Framework v2.0 — Performance & Optimization Guide

## Query Optimization

### 1. Prevent N+1 Queries

**Problem:** Loading a list of records and then loading related data in a loop.

```javascript
// ❌ BAD: N+1 query problem (1 query for list + N queries for users)
const activities = await activityService.search();
for (const activity of activities.items) {
  const user = await userService.read(activity.userId);
  activity.userName = user.name;
}

// ✅ GOOD: Use eager loading
const activities = await activityService.search({
  include: ['user']  // Loads users in single query
});
```

### 2. Domain Filtering (Early Filtering)

**Problem:** Fetching all records then filtering in JavaScript wastes bandwidth and memory.

```javascript
// ❌ BAD: Fetch all then filter
const allUsers = await userService.search({ limit: 10000 });
const activeUsers = allUsers.items.filter(u => u.isActive);

// ✅ GOOD: Filter at database level
const activeUsers = await userService.search({
  domain: [['isActive', '=', true]],
  limit: 20
});
```

### 3. Pagination for Large Datasets

**Problem:** Loading unlimited results causes memory and bandwidth issues.

```javascript
// ✅ GOOD: Always paginate
const page1 = await reportService.search({
  page: 1,
  limit: 50,
  domain: [['status', '=', 'completed']]
});
```

## Response Caching

### Cache Configuration

The `responseCache` middleware automatically caches GET responses based on route patterns:

```javascript
// Routes cached for 1 hour (3600 seconds)
'/api/website/public/menus'        // Content rarely changes
'/api/website/public/settings'     // Admin settings
'/api/editor/templates'            // Predefined templates

// Routes cached for 30 minutes (1800 seconds)
'/api/base/permissions'            // Permission matrix
'/api/base/roles'                  // Role definitions
'/api/modules'                     // Installed modules list
'/api/website/public/pages'        // Public pages

// Not cached (user-specific data)
'/api/users'                       // User records
'/api/base/users'
```

### Cache Headers

When a cached response is returned, the middleware adds an `X-Cache` header:

```
X-Cache: HIT    // Response served from cache
X-Cache: MISS   // Response generated and cached
```

### Manual Cache Clearing

In services, after modifying data, clear related caches:

```javascript
import { clearCacheForRoute } from '../middleware/cacheControl.js';

async updatePageSettings(data, context) {
  const result = await this.adapter.update(1, data);
  
  // Clear cached responses for settings
  await clearCacheForRoute('GET', '/api/website/public/settings');
  
  return result;
}
```

## Security Headers (Helmet)

All Express responses include security headers via Helmet:

```
Content-Security-Policy: (disabled for flexibility)
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000 (production only)
```

## Rate Limiting

### Global Rate Limiting (15 min window)
- **Development:** 100 requests per 15 minutes
- **Production:** 100 requests per 15 minutes (enable via `ENABLE_RATE_LIMIT=true`)

### Authentication Rate Limiting (Always Enabled)
- **Development:** 50 login attempts per 15 minutes
- **Production:** 10 login attempts per 15 minutes

Prevents brute force attacks on `/api/users/login` endpoint.

## API Key Performance

- API keys are hashed with SHA256 and cached after lookup
- Last used timestamp is updated asynchronously (fire-and-forget)
- Expired keys are checked on each request (minimal overhead)

## Database Connection Pooling

### Prisma (Core Models)
```javascript
// Uses connection pool configured in .env
DATABASE_URL="mysql://user:pass@localhost/lume?poolsize=10"
```

### Drizzle (Module Models)
```javascript
// Shares same MySQL connection pool
const db = createConnection(dbConfig);
```

## Redis Caching (Optional)

For distributed systems, enable Redis caching:

```bash
# Set Redis URL in .env
REDIS_URL="redis://localhost:6379"
```

The `responseCache` middleware automatically uses Redis when available.

## Monitoring Query Performance

### Enable Query Logging

```bash
NODE_ENV=development npm run dev
```

In development, all database queries are logged via `requestLogger` middleware.

### Check Cache Hit Rates

Monitor `X-Cache` headers in browser DevTools:
- High HIT rate on `/api/website/public/*` routes ✓
- MISS on first request, HIT on subsequent requests ✓

## Monitoring Security

### Check Security Headers

Browser DevTools → Network → Response Headers should show:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-Powered-By: removed`

### Rate Limit Headers

Rate limit response includes:
- `RateLimit-Limit: 100`
- `RateLimit-Remaining: 95`
- `RateLimit-Reset: 1700000000`

## Best Practices Checklist

- [ ] Use `include` parameter to eager load related data
- [ ] Apply domain filters early at database level
- [ ] Implement pagination for lists with >50 items
- [ ] Cache GET responses for frequently accessed endpoints
- [ ] Clear cache after updates via `clearCacheForRoute()`
- [ ] Monitor response times in production
- [ ] Review security headers in browser DevTools
- [ ] Test rate limiting with load testing tools
- [ ] Use API keys for service-to-service communication
- [ ] Enable Redis for distributed caching systems
