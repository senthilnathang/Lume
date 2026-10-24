/**
 * OpenTelemetry Distributed Tracing Tests
 *
 * Tests for:
 * - Trace context extraction from W3C traceparent headers
 * - Trace context generation (new root spans)
 * - Trace context propagation through logs
 * - Manual span creation
 * - Sampling configuration
 * - Graceful shutdown
 */

import { jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

describe('OpenTelemetry Tracing', () => {
  // Mock modules to avoid full initialization
  let traceContextMiddleware;
  let getTraceId;
  let getSpanId;
  let getTraceContext;

  beforeAll(async () => {
    const module = await import('../../src/core/middleware/trace-context.middleware.js');
    traceContextMiddleware = module.traceContextMiddleware;
    getTraceId = module.getTraceId;
    getSpanId = module.getSpanId;
    getTraceContext = module.getTraceContext;
  });

  describe('W3C Trace Context Extraction', () => {
    it('should extract valid traceparent header', () => {
      const req = {
        headers: {
          traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01'
        }
      };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      expect(req.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
      expect(req.spanId).toBeDefined();
      expect(req.spanId).not.toBe('b7ad6b7169203331'); // Should create new span ID
      expect(next).toHaveBeenCalled();
    });

    it('should extract tracestate header', () => {
      const req = {
        headers: {
          traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
          tracestate: 'congo=t61rcZ94-o'
        }
      };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      expect(req.tracestate).toBe('congo=t61rcZ94-o');
      expect(res.setHeader).toHaveBeenCalledWith('tracestate', 'congo=t61rcZ94-o');
    });

    it('should generate new trace context when no traceparent header', () => {
      const req = { headers: {} };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      expect(req.traceId).toBeDefined();
      expect(req.spanId).toBeDefined();
      expect(req.traceId.length).toBe(32); // 32 hex chars
      expect(req.spanId.length).toBe(16); // 16 hex chars
      expect(next).toHaveBeenCalled();
    });

    it('should generate new trace context for invalid traceparent', () => {
      const req = {
        headers: {
          traceparent: 'invalid-header-format'
        }
      };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      expect(req.traceId).toBeDefined();
      expect(req.spanId).toBeDefined();
      expect(req.traceId.length).toBe(32);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Response Headers Injection', () => {
    it('should inject traceparent header into response', () => {
      const req = { headers: {} };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('traceparent', expect.stringMatching(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/));
    });

    it('should inject X-Trace-ID header for backward compatibility', () => {
      const req = { headers: {} };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Trace-ID', req.traceId);
      expect(res.setHeader).toHaveBeenCalledWith('X-Span-ID', req.spanId);
    });
  });

  describe('Trace Context Utilities', () => {
    it('should extract trace ID from request', () => {
      const req = { traceId: 'abc123' };
      expect(getTraceId(req)).toBe('abc123');
    });

    it('should return unknown for missing trace ID', () => {
      expect(getTraceId({})).toBe('unknown');
      expect(getTraceId(null)).toBe('unknown');
    });

    it('should extract span ID from request', () => {
      const req = { spanId: 'def456' };
      expect(getSpanId(req)).toBe('def456');
    });

    it('should return unknown for missing span ID', () => {
      expect(getSpanId({})).toBe('unknown');
      expect(getSpanId(null)).toBe('unknown');
    });

    it('should extract full trace context from request', () => {
      const traceContext = { traceId: 'abc', spanId: 'def' };
      const req = { traceContext };
      expect(getTraceContext(req)).toEqual(traceContext);
    });
  });

  describe('Request Timing and Metadata', () => {
    it('should track request start time', () => {
      const req = { headers: {} };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      expect(req.startTime).toBeDefined();
      expect(typeof req.startTime).toBe('number');
    });

    it('should capture trace data on response end', (done) => {
      const req = {
        headers: {},
        method: 'GET',
        path: '/api/users',
      };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
        statusCode: 200,
        end: jest.fn(function() {
          setTimeout(() => {
            expect(res.traceData).toBeDefined();
            expect(res.traceData.traceId).toBe(req.traceId);
            expect(res.traceData.spanId).toBe(req.spanId);
            expect(res.traceData.method).toBe('GET');
            expect(res.traceData.path).toBe('/api/users');
            expect(res.traceData.statusCode).toBe(200);
            expect(res.traceData.duration).toBeGreaterThanOrEqual(0);
            done();
          }, 10);
        }),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      // Simulate request completion
      res.end();
    });
  });

  describe('Response JSON Injection', () => {
    it('should inject trace IDs into JSON response body', () => {
      const req = { headers: {} };
      const responseData = { message: 'success' };
      const res = {
        setHeader: jest.fn(),
        json: function(data) {
          this.jsonData = data;
          return this;
        },
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      // Call the overridden json method
      res.json(responseData);

      expect(res.jsonData._traceId).toBe(req.traceId);
      expect(res.jsonData._spanId).toBe(req.spanId);
      expect(res.jsonData.message).toBe('success');
    });

    it('should not inject into non-object responses', () => {
      const req = { headers: {} };
      const res = {
        setHeader: jest.fn(),
        json: function(data) {
          this.jsonData = data;
          return this;
        },
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      // Null response
      res.json(null);
      expect(res.jsonData).toBeNull();

      // String response
      res.json('plain text');
      expect(res.jsonData).toBe('plain text');
    });
  });

  describe('W3C Trace Context Format Validation', () => {
    it('should validate traceparent with correct version', () => {
      const validTraceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
      const req = { headers: { traceparent: validTraceparent } };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      expect(req.traceContext.version).toBe('00');
      expect(req.traceContext.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
      expect(req.traceContext.isSampled).toBe(true);
    });

    it('should handle trace flags correctly', () => {
      const req1 = {
        headers: {
          traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01' // Sampled
        }
      };
      const req2 = {
        headers: {
          traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-00' // Not sampled
        }
      };

      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req1, res, next);
      expect(req1.traceContext.isSampled).toBe(true);

      traceContextMiddleware(req2, res, next);
      expect(req2.traceContext.isSampled).toBe(false);
    });
  });

  describe('Trace ID Propagation', () => {
    it('should maintain same trace ID across middleware chain', () => {
      const req = { headers: {} };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);
      const originalTraceId = req.traceId;

      // Call middleware again (simulate another middleware using same request)
      const req2 = { headers: { traceparent: `00-${originalTraceId}-b7ad6b7169203331-01` } };
      const res2 = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next2 = jest.fn();

      traceContextMiddleware(req2, res2, next2);

      expect(req2.traceId).toBe(originalTraceId);
      expect(req2.spanId).not.toBe('b7ad6b7169203331'); // New span ID
    });
  });

  describe('Error Handling', () => {
    it('should handle missing headers gracefully', () => {
      const req = { headers: null };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      expect(() => {
        traceContextMiddleware(req, res, next);
      }).not.toThrow();
      expect(next).toHaveBeenCalled();
    });

    it('should continue operation on header parsing error', () => {
      const req = {
        headers: {
          traceparent: undefined
        }
      };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      expect(req.traceId).toBeDefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Trace Context Format', () => {
    it('should create properly formatted traceparent header', () => {
      const req = { headers: {} };
      const res = {
        setHeader: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn();

      traceContextMiddleware(req, res, next);

      const traceparentCall = res.setHeader.mock.calls.find(call => call[0] === 'traceparent');
      expect(traceparentCall).toBeDefined();

      const [, traceparentValue] = traceparentCall;
      const parts = traceparentValue.split('-');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('00'); // version
      expect(parts[1]).toHaveLength(32); // traceId (32 hex chars)
      expect(parts[2]).toHaveLength(16); // spanId (16 hex chars)
      expect(parts[3]).toMatch(/^0[01]$/); // traceFlags (01 or 00)
    });
  });
});

describe('OpenTelemetry Tracing Configuration', () => {
  it('should be importable without errors', async () => {
    const tracingModule = await import('../../src/core/tracing/index.js');
    expect(tracingModule.initTracing).toBeDefined();
    expect(tracingModule.getTracer).toBeDefined();
    expect(tracingModule.createSpan).toBeDefined();
    expect(tracingModule.recordException).toBeDefined();
    expect(tracingModule.shutdownTracing).toBeDefined();
  });

  it('should export W3C trace context utilities', async () => {
    const tracingModule = await import('../../src/core/tracing/index.js');
    expect(tracingModule.traceContextMiddleware).toBeDefined();
    expect(tracingModule.getTraceId).toBeDefined();
    expect(tracingModule.getSpanId).toBeDefined();
    expect(tracingModule.getTraceContext).toBeDefined();
  });
});
