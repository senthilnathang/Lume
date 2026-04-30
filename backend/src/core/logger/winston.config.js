/**
 * Winston Logger Configuration
 * Structured JSON logging with multiple transports
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {
  LOG_LEVEL = 'info',
  LOG_FORMAT = 'json',
  LOG_DIR = 'logs',
  NODE_ENV = 'development',
  LOGTAIL_SOURCE_TOKEN = '',
  DATADOG_API_KEY = '',
} = process.env;

// Custom log format with timestamp, level, message, and context
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
    const logObj = {
      timestamp,
      level,
      message,
      context: metadata || {},
      stack: stack || undefined,
    };

    // Remove undefined values
    if (!stack) delete logObj.stack;

    return JSON.stringify(logObj);
  })
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const colors = {
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
      info: '\x1b[36m',    // Cyan
      debug: '\x1b[35m',   // Magenta
      trace: '\x1b[90m',   // Gray
      reset: '\x1b[0m',
    };

    const color = colors[level] || colors.reset;
    const stackTrace = stack ? `\n${stack}` : '';
    return `${color}[${timestamp}] ${level.toUpperCase()}${colors.reset}: ${message}${stackTrace}`;
  })
);

// Build transports array
const transports = [];

// Console transport (always enabled, different format per env)
const consoleTransport = new winston.transports.Console({
  format: LOG_FORMAT === 'json' ? customFormat : consoleFormat,
  level: LOG_LEVEL,
});
transports.push(consoleTransport);

// Daily rotate file transport (production-grade)
const dailyRotateTransport = new DailyRotateFile({
  filename: join(LOG_DIR, 'lume-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxDays: '14d',
  format: customFormat,
  level: LOG_LEVEL,
  utc: false,
});
transports.push(dailyRotateTransport);

// Error log file (separate file for errors)
const errorLogTransport = new DailyRotateFile({
  filename: join(LOG_DIR, 'lume-error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxDays: '30d',
  format: customFormat,
  level: 'error',
  utc: false,
});
transports.push(errorLogTransport);

// Optional: Logtail cloud logging (if token provided)
if (LOGTAIL_SOURCE_TOKEN) {
  try {
    const { Logtail } = await import('@logtail/winston');
    const logtailTransport = new Logtail({
      sourceToken: LOGTAIL_SOURCE_TOKEN,
      level: LOG_LEVEL,
    });
    transports.push(logtailTransport);
  } catch (err) {
    console.warn('⚠️  Logtail transport initialization failed:', err.message);
  }
}

// Create Winston logger instance
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: customFormat,
  defaultMeta: {
    service: 'lume',
    environment: NODE_ENV,
    version: '2.0.0',
    pid: process.pid,
  },
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: join(LOG_DIR, 'exceptions.log'), format: customFormat }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: join(LOG_DIR, 'rejections.log'), format: customFormat }),
  ],
});

// Handle uncaught exceptions at process level
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

export { logger, transports };

export default logger;
