# OpenTelemetry Tracing Quick Start Guide

## Setup

### 1. Configure Environment Variables

```bash
# .env or docker-compose

# Required: OTLP collector endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Optional: Service metadata
OTEL_SERVICE_NAME=lume-backend
OTEL_SERVICE_VERSION=2.0.0

# Optional: Sampling configuration
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0  # 1.0 = 100%, 0.1 = 10%
```

### 2. Start OTEL Collector (Local Development)

Using Docker:
```bash
docker run -d \
  -p 4317:4317 \
  -p 16686:16686 \
  jaegertracing/all-in-one

# Jaeger UI: http://localhost:16686
```

Or with Jaeger agent:
```bash
docker run -d \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 16686:16686 \
  jaegertracing/all-in-one

# Set in .env:
# JAEGER_AGENT_HOST=localhost
# JAEGER_AGENT_PORT=6831
```

### 3. Start Backend

```bash
npm run dev

# Should see in logs:
# ✅ OpenTelemetry tracing initialized
#    Endpoint: http://localhost:4317
#    Service: lume-backend@2.0.0
#    Sampling: 100.0%
#    Processor: Simple
```

## Usage

### Basic Request Tracing

Requests are automatically traced. Trace IDs appear in:

1. **Response Headers**
   ```
   traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
   X-Trace-ID: 0af7651916cd43dd8448eb211c80319c
   X-Span-ID: b7ad6b7169203331
   ```

2. **Response JSON**
   ```json
   {
     "data": { ... },
     "_traceId": "0af7651916cd43dd8448eb211c80319c",
     "_spanId": "b7ad6b7169203331"
   }
   ```

3. **Structured Logs**
   ```json
   {
     "timestamp": "2026-04-30T21:00:00.000Z",
     "level": "info",
     "message": "GET /api/users - 200",
     "context": {
       "traceId": "0af7651916cd43dd8448eb211c80319c"
     }
   }
   ```

### Manual Span Creation

```javascript
import { createSpan, recordException } from '@/core/tracing';

// Create a span for a custom operation
const span = createSpan('process-payment', {
  orderId: order.id,
  amount: order.total
});

try {
  // Your operation
  await processPayment(order);
  span.addEvent('payment-success', { transactionId: txn.id });
} catch (error) {
  // Record exception in span
  recordException(error, span);
  throw error;
} finally {
  // Always end the span
  span.end();
}
```

### Accessing Trace Context in Routes

```javascript
import { getTraceId, getSpanId } from '@/core/tracing';

app.get('/api/users/:id', (req, res) => {
  const traceId = getTraceId(req);
  const spanId = getSpanId(req);

  console.log(`[${traceId}] Fetching user ${req.params.id}`);

  // Use trace ID for logging and debugging
  logger.info('User request', { traceId, userId: req.params.id });

  res.json({ data: user });
});
```

### Creating Child Spans

```javascript
import { createChildSpan } from '@/core/tracing';

app.post('/api/complex-operation', (req, res) => {
  // Create child spans for sub-operations
  const dbSpan = createChildSpan(req, 'database-query', {
    table: 'users',
    operation: 'SELECT'
  });

  try {
    // Database operation
    const result = await db.users.findMany();
    dbSpan.end();

    // Second child span
    const cacheSpan = createChildSpan(req, 'cache-update');
    await cache.set(`users:all`, result);
    cacheSpan.end();

    res.json({ data: result });
  } catch (error) {
    recordException(error, dbSpan);
    dbSpan.end();
    throw error;
  }
});
```

## Viewing Traces

### Jaeger UI

1. Navigate to http://localhost:16686
2. Select "lume-backend" from Service dropdown
3. View recent traces
4. Click on trace to see:
   - Timeline of all spans
   - Latency for each operation
   - Error details and stack traces
   - Request/response details

### Datadog

If using Datadog:
```bash
# Set Datadog configuration
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.datadoghq.com
DD_API_KEY=your-api-key
DD_SERVICE=lume-backend
DD_ENV=production
DD_VERSION=2.0.0
```

## Sampling Strategies

### Development (100% Sampling)
```env
OTEL_TRACES_SAMPLER_ARG=1.0
```
✅ See every request
❌ High memory/CPU usage

### Production (10% Sampling)
```env
OTEL_TRACES_SAMPLER_ARG=0.1
```
✅ Low overhead, representative sample
❌ May miss rare events

### Custom Sampling
```env
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.5  # 50%
```

## Distributed Tracing Across Services

When calling downstream services, forward trace context:

```javascript
import axios from 'axios';
import { trace } from '@opentelemetry/api';

async function callDownstream(url, options) {
  const span = trace.getActiveSpan();

  const response = await axios.get(url, {
    headers: {
      // Forward W3C trace context
      'traceparent': span.spanContext().traceId,
      // Optional: forward tracestate
      'tracestate': span.spanContext().traceState?.serialize() || ''
    },
    ...options
  });

  return response.data;
}
```

## Performance Considerations

### Memory Usage
- **Simple Processor**: ~50MB baseline
- **Batch Processor**: ~50MB + buffer (512 spans max)
- **High sampling rate**: +1MB per 1000 spans/sec

### CPU Usage
- **Simple Processor**: ~2% CPU (immediate export)
- **Batch Processor**: <1% CPU (batched export)
- **Sampling**: Each span costs ~1-2ms

### Network
- **OTLP/HTTP**: ~5KB per 100 spans
- **Batch size**: 512 spans by default
- **Export interval**: 5 seconds (production)

## Troubleshooting

### No Traces Appearing

1. Check OTEL endpoint is running:
   ```bash
   curl http://localhost:4317/
   ```

2. Verify environment variable:
   ```bash
   echo $OTEL_EXPORTER_OTLP_ENDPOINT
   ```

3. Check logs for initialization error:
   ```bash
   npm run dev 2>&1 | grep -i otel
   ```

### High Memory Usage

1. Reduce sampling rate:
   ```env
   OTEL_TRACES_SAMPLER_ARG=0.1  # 10% instead of 100%
   ```

2. Use BatchSpanProcessor in development:
   - Modify `tracing.config.js`
   - Change NODE_ENV=development to check

### Missing Spans

1. Verify service is in trace context:
   ```javascript
   const traceId = req.traceId;
   console.log('Trace ID:', traceId);
   ```

2. Check span is ended:
   ```javascript
   span.end();  // Required to export span
   ```

3. Check for errors:
   ```bash
   # Check application logs
   tail -f logs/error.log
   ```

## Best Practices

1. **Always end spans**: Use try/finally block
2. **Add relevant context**: Use attributes for business data
3. **Don't trace sensitive data**: Avoid PII in span names/attributes
4. **Sample wisely**: 100% in dev, 1-10% in production
5. **Monitor resource usage**: Track memory/CPU impact
6. **Use child spans**: Decompose operations into logical units
7. **Name spans clearly**: Use snake_case for span names
8. **Include timestamps**: Let OpenTelemetry handle it

## Example: Complete Request Flow

```javascript
import { createChildSpan, recordException } from '@/core/tracing';
import { logger } from '@/config/logger';

app.post('/api/orders', async (req, res) => {
  const traceId = req.traceId;

  try {
    logger.info('Creating order', { traceId });

    // Database span
    const dbSpan = createChildSpan(req, 'db.order.create', {
      items: req.body.items.length
    });

    const order = await db.orders.create(req.body);
    dbSpan.end();

    // External API span
    const paymentSpan = createChildSpan(req, 'payment.process', {
      orderId: order.id,
      amount: order.total
    });

    const payment = await paymentAPI.charge(order.total);
    paymentSpan.end();

    // Cache span
    const cacheSpan = createChildSpan(req, 'cache.update');
    await cache.set(`order:${order.id}`, order);
    cacheSpan.end();

    logger.info('Order created', { traceId, orderId: order.id });
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error('Order creation failed', { traceId, error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## References

- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry JS](https://opentelemetry.io/docs/instrumentation/js/)
- [Jaeger UI](https://www.jaegertracing.io/docs/deployment/#all-in-one)
- [OTEL Sampling](https://opentelemetry.io/docs/reference/specification/trace/sdk/#sampling)
