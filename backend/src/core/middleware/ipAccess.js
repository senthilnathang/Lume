/**
 * IP Access Enforcement Middleware
 * Checks incoming requests against IP whitelist/blacklist rules.
 * Caches rules in memory and refreshes every 5 minutes.
 */

let cachedRules = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let securityServiceInstance = null;

/**
 * Set the security service instance for IP access checking.
 * Call this during module initialization.
 */
export function setSecurityService(service) {
  securityServiceInstance = service;
}

/**
 * Express middleware that enforces IP access rules.
 * Bypasses localhost in development mode.
 */
export function ipAccessMiddleware(req, res, next) {
  if (!securityServiceInstance) {
    return next(); // No security service configured, pass through
  }

  const ip = req.ip || req.connection?.remoteAddress || '';

  // Bypass localhost in development
  if (process.env.NODE_ENV !== 'production') {
    const localhostIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    if (localhostIPs.includes(ip)) {
      return next();
    }
  }

  checkIpAccess(ip)
    .then(result => {
      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          reason: result.reason,
        });
      }
      next();
    })
    .catch(() => next()); // On error, allow through
}

async function checkIpAccess(ip) {
  if (!securityServiceInstance) return { allowed: true };
  return securityServiceInstance.checkIpAccess(ip);
}

export default ipAccessMiddleware;
