# Lume Structured Logging - Quick Start Guide

## Configuration

### Environment Variables (.env)
```env
LOG_LEVEL=info          # error, warn, info, debug, trace
LOG_FORMAT=json         # json or text
LOG_DIR=logs            # Directory for log files
```

## Using the Logger

### In Your Code
```javascript
import { createLogger, getLogger } from './core/logger/index.js';

// Create a context-specific logger
const logger = createLogger('UserService');
logger.info('User created', { userId: 123, email: 'user@example.com' });

// Or use the default logger
import { log } from './core/logger/index.js';
log.warn('Something unusual happened', { reason: 'low_memory' });
```

### Output Examples

**Info Log (JSON)**
```json
{
  "timestamp": "2026-04-30 21:32:23.913",
  "level": "info",
  "message": "User created",
  "context": {
    "userId": 123,
    "email": "user@example.com"
  }
}
```

**Error Log with Stack**
```json
{
  "timestamp": "2026-04-30 21:32:24.020",
  "level": "error",
  "message": "Database connection failed",
  "context": {
    "error": "ECONNREFUSED",
    "stack": "Error: ECONNREFUSED\n    at ..."
  }
}
```

## Sensitive Data Masking

Automatic masking of sensitive fields:
- Passwords
- Tokens (auth, refresh, access)
- API Keys
- Secrets
- SSN, Credit Card numbers
- And 20+ more patterns

### Example
```javascript
const logData = {
  username: 'john_doe',        // ✓ Logged as-is
  password: 'secret123',       // ✗ Masked: ***REDACTED***
  apiKey: 'sk_live_12345',     // ✗ Masked: ***REDACTED***
};

logger.info('Request', logData);
// Output: username logged, password and apiKey redacted
```

## Log Files

### Location
```
logs/
├── lume-2026-04-30.log           # Daily log (20MB max, 14-day retention)
├── lume-error-2026-04-30.log     # Error log (30-day retention)
├── exceptions.log                # Uncaught exceptions
└── rejections.log                # Unhandled promise rejections
```

### Rotation
- Daily rotation at midnight (local time)
- Naming format: `lume-%YYYY-MM-DD%.log`
- Old logs automatically deleted after retention period

## Monitoring

### Check Latest Logs
```bash
tail -f logs/lume-$(date +%Y-%m-%d).log | jq .
```

### Search Errors
```bash
grep '"level":"error"' logs/lume-*.log | jq .
```

### Filter by User
```bash
jq 'select(.context.userId == 123)' logs/lume-*.log
```

### Check Slow Requests
```bash
jq 'select(.context.durationMs > 1000)' logs/lume-*.log
```

## Request Tracing

Every request gets a unique trace ID:
```javascript
// In middleware/handlers
app.get('/api/users/:id', (req, res) => {
  const traceId = req.id;  // UUID for this request
  // All logs for this request will have the same traceId
  logger.info('Getting user', { traceId, userId: req.params.id });
});
```

### Cross-Service Correlation
For distributed tracing, propagate the trace ID:
```javascript
// When calling another service
const response = await axios.get('/api/other-service', {
  headers: {
    'X-Trace-ID': req.id
  }
});
```

## Performance

- Minimal overhead: < 1ms per request
- Async file writing (non-blocking)
- ~100KB/day for 1000 requests
- ~2MB memory footprint

## Cloud Integration (Optional)

### Logtail (log streaming)
```env
LOGTAIL_SOURCE_TOKEN=your_token_here
```

### Datadog (metrics + logs)
```env
DATADOG_API_KEY=your_key_here
```

## Health Checks

These endpoints are NOT logged (too noisy):
- `/health`
- `/metrics`
- `/api/health`
- `/api/lume/health`
- `/api/gawdesy/health`

## Troubleshooting

### Logs not appearing
1. Check `LOG_DIR` directory exists: `mkdir -p logs`
2. Check `LOG_LEVEL` is set appropriately
3. Check file permissions: `ls -la logs/`

### Large log files
1. Adjust `LOG_LEVEL` to warn or error
2. Logs auto-rotate at 20MB (configurable)
3. Old logs deleted after 14 days (configurable)

### Missing user context
1. Ensure user is authenticated (has `req.user`)
2. Check middleware order (auth before logging)
3. Verify `req.user` has `id`, `email`, `role` fields

---

**For more details, see**: `/opt/Lume/PHASE_6_TASK_1_SUMMARY.md`
