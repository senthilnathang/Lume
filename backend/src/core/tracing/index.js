/**
 * OpenTelemetry Distributed Tracing Public API
 *
 * Provides unified interface for distributed tracing with OpenTelemetry.
 * Integrates with W3C Trace Context middleware for automatic context propagation.
 *
 * Usage:
 * ```javascript
 * import { initTracing, getTracer, createSpan, recordException } from '@core/tracing';
 *
 * // Initialize early in main app file
 * await initTracing();
 *
 * // Manual span creation
 * const span = createSpan('custom-operation', { userId: user.id });
 * try {
 *   // Do work
 * } catch (error) {
 *   recordException(error, span);
 * } finally {
 *   span.end();
 * }
 * ```
 */

export {
  initTracing,
  getTracer,
  createSpan,
  recordException,
  shutdownTracing,
  runInTraceContext,
} from './tracing.config.js';

export {
  traceContextMiddleware,
  getTraceId,
  getSpanId,
  getTraceContext,
  createChildSpan,
} from '../middleware/trace-context.middleware.js';
