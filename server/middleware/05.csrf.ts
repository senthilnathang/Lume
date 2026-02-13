import { randomBytes } from 'crypto';

export default defineEventHandler((event) => {
  const enabled = process.env.CSRF_ENABLED === 'true';
  if (!enabled) return;

  const method = getMethod(event);

  // Only protect state-changing methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return;

  // Only protect API routes
  const path = getRequestURL(event).pathname;
  if (!path.startsWith('/api/')) return;

  // Skip CSRF for login/register (they use other protection)
  if (path.includes('/auth/login') || path.includes('/auth/register')) return;

  const csrfCookie = getCookie(event, 'csrf_token');
  const csrfHeader = getHeader(event, 'x-csrf-token');

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    throw createError({
      statusCode: 403,
      statusMessage: 'CSRF token missing or invalid',
    });
  }
});

/**
 * Generate a CSRF token and set it as a cookie.
 * Call this from the GET /api/v1/auth/csrf-token endpoint.
 */
export function generateCsrfToken(event: any): string {
  const token = randomBytes(32).toString('hex');
  setCookie(event, 'csrf_token', token, {
    httpOnly: false, // Must be readable by JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600,
    path: '/',
  });
  return token;
}
