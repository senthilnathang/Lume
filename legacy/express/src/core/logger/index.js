/**
 * Logger Module - Public API
 * Provides logger instances with context support
 */

import { logger, transports } from './winston.config.js';

/**
 * Create a logger instance with a specific context
 * The context name will be added to all logs from this logger
 */
export function createLogger(context) {
  return logger.child({ context });
}

/**
 * Get the default logger instance
 */
export function getLogger() {
  return logger;
}

/**
 * Log at different levels
 */
export const log = {
  error: (message, metadata = {}) => logger.error(message, metadata),
  warn: (message, metadata = {}) => logger.warn(message, metadata),
  info: (message, metadata = {}) => logger.info(message, metadata),
  debug: (message, metadata = {}) => logger.debug(message, metadata),
};

/**
 * Export sanitizers for manual use
 */
export { default as logSanitizer } from './log-sanitizer.js';

/**
 * Export Winston transports for custom configuration
 */
export { transports };

export default logger;
