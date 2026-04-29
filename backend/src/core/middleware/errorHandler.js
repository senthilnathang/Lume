import { responseUtil } from '../../shared/utils/index.js';
import { HTTP_STATUS } from '../../shared/constants/index.js';

export const errorHandler = (err, req, res, next) => {
  // Log error details differently in production vs development
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    // Production: log message + code only (hide stack trace)
    console.error(`Error [${err.code || 'ERROR'}]: ${err.message}`);
  } else {
    // Development: log full error with stack for debugging
    console.error('Error:', err);
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(HTTP_STATUS.BAD_REQUEST).json(responseUtil.validationError(errors));
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const fields = err.meta?.target || [];
    return res.status(HTTP_STATUS.CONFLICT).json(responseUtil.error('Resource already exists', [{ field: fields.join(', '), message: 'Already exists' }], 'CONFLICT'));
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(HTTP_STATUS.NOT_FOUND).json(responseUtil.notFound('Record'));
  }

  // Prisma validation error
  if (err.code === 'P2000') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(responseUtil.validationError([{ field: err.meta?.column_name, message: 'Value too long for column' }]));
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(responseUtil.unauthorized('Invalid token'));
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(responseUtil.unauthorized('Token expired'));
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(responseUtil.error('Database connection failed', null, 'SERVICE_UNAVAILABLE'));
  }

  const statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json(responseUtil.error(message, null, err.code || 'ERROR'));
};

export const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json(responseUtil.notFound('Endpoint'));
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
