import { responseUtil } from '../../shared/utils/index.js';
import { HTTP_STATUS } from '../../shared/constants/index.js';

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(HTTP_STATUS.BAD_REQUEST).json(responseUtil.validationError(errors));
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: `${e.value} already exists`
    }));
    return res.status(HTTP_STATUS.CONFLICT).json(responseUtil.error('Resource already exists', errors, 'CONFLICT'));
  }

  if (err.name === 'SequelizeValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(HTTP_STATUS.BAD_REQUEST).json(responseUtil.validationError(errors));
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
