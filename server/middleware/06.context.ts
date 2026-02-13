import { randomUUID } from 'crypto';

export default defineEventHandler((event) => {
  // Generate a unique request ID for tracing
  const requestId = getHeader(event, 'x-request-id') || randomUUID();
  setResponseHeader(event, 'X-Request-Id', requestId);

  // Store in event context for later use in logging/audit
  event.context.requestId = requestId;
  event.context.startTime = Date.now();

  // Extract client IP
  event.context.clientIp =
    getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getHeader(event, 'x-real-ip')
    || 'unknown';
});
