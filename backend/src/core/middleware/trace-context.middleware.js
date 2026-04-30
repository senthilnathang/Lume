/**
 * W3C Trace Context Middleware
 *
 * Extracts trace context from incoming requests per W3C Trace Context specification:
 * https://www.w3.org/TR/trace-context/
 *
 * Headers:
 * - traceparent: version-traceId-spanId-traceFlags
 *   Example: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 * - tracestate: vendor-specific trace state (optional)
 *
 * This middleware:
 * 1. Extracts or generates trace_id (root trace for entire request chain)
 * 2. Extracts or generates span_id (unique ID for this service's span)
 * 3. Attaches both to req.traceId and req.spanId
 * 4. Injects into response headers (X-Trace-ID for backward compatibility)
 * 5. Passes trace context to logger for automatic correlation
 */

import { v4 as uuidv4 } from 'uuid';
import { trace, context } from '@opentelemetry/api';

/**
 * Parse W3C traceparent header
 * Format: version-traceId-spanId-traceFlags
 * Example: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 *
 * @param {string} traceparent - Traceparent header value
 * @returns {object|null} Parsed trace context or null if invalid
 */
function parseTraceparent(traceparent) {
  if (!traceparent || typeof traceparent !== 'string') return null;

  const parts = traceparent.split('-');
  if (parts.length !== 4) return null;

  const [version, traceId, parentSpanId, traceFlags] = parts;

  // Validate format
  if (version !== '00' || !traceId.match(/^[0-9a-f]{32}$/) || !parentSpanId.match(/^[0-9a-f]{16}$/)) {
    return null;
  }

  return {
    version,
    traceId,
    parentSpanId,
    traceFlags: parseInt(traceFlags, 16),
    isSampled: (parseInt(traceFlags, 16) & 0x01) === 1,
  };
}

/**
 * Generate new trace context (for root spans)
 *
 * @returns {object} New trace context
 */
function generateTraceContext() {
  // Generate 32-char hex trace ID (remove hyphens from 2 UUIDs)
  const traceId = (uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '')).slice(0, 32);
  // Generate 16-char hex span ID (remove hyphens from 1 UUID and take first 16 chars)
  const spanId = uuidv4().replace(/-/g, '').slice(0, 16);

  return {
    version: '00',
    traceId,
    spanId,
    traceFlags: 1, // Sampled
  };
}

/**
 * Create traceparent header value
 *
 * @param {object} context - Trace context
 * @returns {string} Traceparent header value
 */
function createTraceparent(traceContext) {
  return `${traceContext.version}-${traceContext.traceId}-${traceContext.spanId}-${traceContext.traceFlags.toString(16).padStart(2, '0')}`;
}

/**
 * Express middleware for W3C Trace Context extraction and injection
 *
 * Attaches to req:
 * - req.traceId: Trace ID for correlating logs across services
 * - req.spanId: Span ID for this service's operation
 * - req.traceparent: Full W3C traceparent value
 * - req.traceContext: Full trace context object
 *
 * Injects into res:
 * - traceparent: W3C standard header
 * - tracestate: Vendor-specific trace state
 * - X-Trace-ID: Backward compatibility header
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
export function traceContextMiddleware(req, res, next) {
  // Extract trace context from request headers
  const incomingTraceparent = req?.headers?.traceparent;
  const incomingTracestate = req?.headers?.tracestate || '';

  let traceContext;

  if (incomingTraceparent) {
    // Parse incoming trace context
    const parsed = parseTraceparent(incomingTraceparent);

    if (parsed) {
      // Valid trace context - propagate and create new span
      traceContext = {
        ...parsed,
        parentSpanId: parsed.spanId, // Original span becomes parent
        spanId: generateTraceContext().spanId, // New span ID for this service
      };
    } else {
      // Invalid traceparent - generate new trace
      traceContext = generateTraceContext();
    }
  } else {
    // No incoming trace context - this is a root request
    traceContext = generateTraceContext();
  }

  // Attach to request for logger and manual span creation
  req.traceId = traceContext.traceId;
  req.spanId = traceContext.spanId;
  req.traceparent = createTraceparent(traceContext);
  req.traceContext = traceContext;
  req.tracestate = incomingTracestate;

  // Inject trace context into response headers
  res.setHeader('traceparent', req.traceparent);
  if (incomingTracestate) {
    res.setHeader('tracestate', incomingTracestate);
  }

  // Backward compatibility header
  res.setHeader('X-Trace-ID', req.traceId);
  res.setHeader('X-Span-ID', req.spanId);

  // Create log context with trace info
  const originalJson = res.json;
  res.json = function(data) {
    // Inject trace context into response body for client-side tracking
    if (typeof data === 'object' && data !== null) {
      data._traceId = req.traceId;
      data._spanId = req.spanId;
    }
    return originalJson.call(this, data);
  };

  // Track request timing for performance metrics
  req.startTime = Date.now();
  const originalEnd = res.end;

  res.end = function(chunk, encoding) {
    const duration = Date.now() - req.startTime;

    // Store trace info for logging/monitoring
    res.traceData = {
      traceId: req.traceId,
      spanId: req.spanId,
      traceparent: req.traceparent,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    };

    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Utility: Get trace ID from request (for use in route handlers)
 *
 * @param {Request} req - Express request
 * @returns {string} Trace ID
 */
export function getTraceId(req) {
  return req?.traceId || 'unknown';
}

/**
 * Utility: Get span ID from request
 *
 * @param {Request} req - Express request
 * @returns {string} Span ID
 */
export function getSpanId(req) {
  return req?.spanId || 'unknown';
}

/**
 * Utility: Get full trace context from request
 *
 * @param {Request} req - Express request
 * @returns {object} Trace context
 */
export function getTraceContext(req) {
  return req?.traceContext || {
    traceId: 'unknown',
    spanId: 'unknown',
  };
}

/**
 * Utility: Create child span for this request
 * Automatically links to parent trace and span
 *
 * @param {Request} req - Express request
 * @param {string} name - Span name
 * @param {object} attributes - Span attributes
 * @returns {Span} OpenTelemetry span
 */
export function createChildSpan(req, name, attributes = {}) {
  const tracer = trace.getTracer('lume-backend', '2.0.0');

  // Create span linked to parent
  const span = tracer.startSpan(name, {
    attributes: {
      'trace.id': req.traceId,
      'span.parent_id': req.spanId,
      ...attributes,
    },
  });

  return span;
}

export default {
  traceContextMiddleware,
  getTraceId,
  getSpanId,
  getTraceContext,
  createChildSpan,
};
