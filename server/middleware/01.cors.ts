export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const origin = getHeader(event, 'origin') || '';
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());

  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    setResponseHeaders(event, {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Request-Id',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    });
  }

  // Handle preflight
  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204);
    return '';
  }
});
