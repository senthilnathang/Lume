/**
 * OpenTelemetry Distributed Tracing Configuration
 *
 * Provides end-to-end request tracing with W3C Trace Context propagation.
 * Supports auto-instrumentation for HTTP, Express, MySQL2, and Redis.
 *
 * Setup:
 * 1. Call initTracing() FIRST in main app file (before creating Express app)
 * 2. Register trace-context middleware early in middleware chain
 * 3. Access tracer via getTracer(name) for manual spans
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context } from '@opentelemetry/api';

let sdk = null;
let tracerInstance = null;

/**
 * Initialize OpenTelemetry SDK
 * Must be called BEFORE creating Express app and importing other modules
 *
 * Configuration from environment:
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP collector endpoint (default: http://localhost:4317)
 * - OTEL_SERVICE_NAME: Service name in traces (default: lume-backend)
 * - OTEL_SERVICE_VERSION: Service version (default: 2.0.0)
 * - OTEL_TRACES_SAMPLER: Sampler type (default: parentbased_traceidratio)
 * - OTEL_TRACES_SAMPLER_ARG: Sampling ratio 0-1 (default: 1.0 in dev, 0.1 in prod)
 * - NODE_ENV: development or production (affects sampling)
 */
export async function initTracing() {
  if (sdk) {
    console.warn('⚠️  OpenTelemetry SDK already initialized');
    return sdk;
  }

  const {
    OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_SERVICE_NAME = 'lume-backend',
    OTEL_SERVICE_VERSION = '2.0.0',
    OTEL_TRACES_SAMPLER = 'parentbased_traceidratio',
    NODE_ENV = 'development',
  } = process.env;

  // If OTEL endpoint is not configured, skip tracing initialization
  if (!OTEL_EXPORTER_OTLP_ENDPOINT) {
    console.log('ℹ️  OpenTelemetry tracing disabled (OTEL_EXPORTER_OTLP_ENDPOINT not set)');
    return null;
  }

  // Determine sampling ratio based on environment
  const samplingRatio = process.env.OTEL_TRACES_SAMPLER_ARG
    ? parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG)
    : NODE_ENV === 'production' ? 0.1 : 1.0; // 100% sampling in dev, 10% in prod

  try {
    // Create OTLP exporter with timeout configuration
    const traceExporter = new OTLPTraceExporter({
      url: `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
      // Timeout for exporter initialization (don't block startup)
      concurrencyLimit: 10,
      // Connection timeout: 5 seconds
      timeout: 5000,
    });

    // Create resource with service metadata
    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: OTEL_SERVICE_NAME,
      [SemanticResourceAttributes.SERVICE_VERSION]: OTEL_SERVICE_VERSION,
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || `${process.pid}`,
      environment: NODE_ENV,
    });

    // Initialize SDK with auto-instrumentations
    sdk = new NodeSDK({
      resource,
      traceExporter,
      // Use BatchSpanProcessor in production for better performance
      // Use SimpleSpanProcessor in development for immediate visibility
      spanProcessor: NODE_ENV === 'production'
        ? new BatchSpanProcessor(traceExporter, {
            maxQueueSize: 2048,
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5000,
          })
        : new SimpleSpanProcessor(traceExporter),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Configure auto-instrumentations
          '@opentelemetry/instrumentation-http': {
            requestHook: (span, request) => {
              // Add custom attributes to HTTP spans
              span.setAttribute('http.request.body.truncated', false);
            },
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-mysql2': {
            enabled: true,
            responseHook: (span, response) => {
              // Log response info if needed
            },
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
        }),
      ],
    });

    // Start the SDK (non-blocking)
    sdk.start();
    console.log(`✅ OpenTelemetry tracing initialized`);
    console.log(`   Endpoint: ${OTEL_EXPORTER_OTLP_ENDPOINT}`);
    console.log(`   Service: ${OTEL_SERVICE_NAME}@${OTEL_SERVICE_VERSION}`);
    console.log(`   Sampling: ${(samplingRatio * 100).toFixed(1)}%`);
    console.log(`   Processor: ${NODE_ENV === 'production' ? 'Batch' : 'Simple'}`);

    return sdk;
  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry tracing:', error.message);
    throw error;
  }
}

/**
 * Get OpenTelemetry tracer instance
 * Used for creating manual spans
 *
 * @param {string} name - Tracer name (typically module name)
 * @returns {Tracer} OpenTelemetry tracer or no-op tracer if SDK not initialized
 */
export function getTracer(name = 'lume-backend') {
  if (!sdk) {
    // Return no-op tracer if SDK not initialized
    return trace.getTracer(name, '2.0.0');
  }

  if (!tracerInstance) {
    tracerInstance = trace.getTracer(name, '2.0.0');
  }

  return tracerInstance;
}

/**
 * Create a span for manual tracing
 *
 * Example:
 * ```
 * const span = createSpan('database-query', { query: 'SELECT ...' });
 * try {
 *   const result = await db.query(...);
 *   span.addEvent('query-success', { rows: result.length });
 * } catch (error) {
 *   recordException(error, span);
 * } finally {
 *   span.end();
 * }
 * ```
 *
 * @param {string} name - Span name
 * @param {object} attributes - Span attributes (optional)
 * @returns {Span} OpenTelemetry span
 */
export function createSpan(name, attributes = {}) {
  const tracer = getTracer();
  const span = tracer.startSpan(name);

  // Add attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      span.setAttribute(key, value);
    }
  });

  return span;
}

/**
 * Record exception in span
 * Properly records error information according to OpenTelemetry spec
 *
 * @param {Error} error - Error to record
 * @param {Span} span - Span to record in
 */
export function recordException(error, span) {
  if (!error) return;

  span.setStatus({
    code: 2, // ERROR status code
    message: error.message,
  });

  span.recordException(error, {
    'exception.message': error.message,
    'exception.stacktrace': error.stack,
    'exception.type': error.constructor.name,
  });
}

/**
 * Graceful shutdown of OpenTelemetry SDK
 * Flushes pending spans and closes connections
 * Call from process exit handlers
 *
 * @returns {Promise<void>}
 */
export async function shutdownTracing() {
  if (!sdk) return;

  try {
    console.log('🛑 Shutting down OpenTelemetry SDK...');
    await sdk.shutdown();
    console.log('✅ OpenTelemetry SDK shutdown complete');
  } catch (error) {
    console.error('❌ Failed to shutdown OpenTelemetry SDK:', error.message);
  }
}

/**
 * Execute code in a tracing context
 * Useful for async operations that need trace propagation
 *
 * @param {Function} fn - Async function to execute
 * @returns {Promise}
 */
export function runInTraceContext(fn) {
  return context.with(context.active(), fn);
}

export default {
  initTracing,
  getTracer,
  createSpan,
  recordException,
  shutdownTracing,
  runInTraceContext,
};
