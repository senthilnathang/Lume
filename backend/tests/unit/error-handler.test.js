import { jest } from '@jest/globals';
import { errorHandler, notFoundHandler, asyncHandler } from '../../src/core/middleware/errorHandler.js';

// Mock Express req/res/next
const mockReq = (overrides = {}) => ({
  path: '/api/test',
  method: 'GET',
  ...overrides
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('errorHandler middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('handles ValidationError with 400', () => {
    const err = {
      name: 'ValidationError',
      errors: {
        email: { path: 'email', message: 'Email is required' }
      }
    };

    const res = mockRes();
    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
      })
    );
  });

  test('handles Prisma unique constraint error (P2002) with 409', () => {
    const err = {
      code: 'P2002',
      meta: { target: ['email'] }
    };

    const res = mockRes();
    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'CONFLICT' })
      })
    );
  });

  test('handles Prisma validation error (P2000) with 400', () => {
    const err = {
      code: 'P2000',
      meta: { column_name: 'name' }
    };

    const res = mockRes();
    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('handles Prisma record not found (P2025) with 404', () => {
    const err = {
      code: 'P2025',
      message: 'Record to update not found'
    };

    const res = mockRes();
    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('handles JsonWebTokenError with 401', () => {
    const err = { name: 'JsonWebTokenError', message: 'invalid signature' };

    const res = mockRes();
    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' })
      })
    );
  });

  test('handles TokenExpiredError with 401', () => {
    const err = { name: 'TokenExpiredError', message: 'jwt expired' };

    const res = mockRes();
    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('handles ECONNREFUSED with 503', () => {
    const err = { code: 'ECONNREFUSED', message: 'Connection refused' };

    const res = mockRes();
    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  test('handles generic error with 500', () => {
    const err = new Error('Something broke');

    const res = mockRes();
    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ message: 'Something broke' })
      })
    );
  });

  test('uses custom status code from error', () => {
    const err = new Error('Custom');
    err.statusCode = 422;

    const res = mockRes();
    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(422);
  });
});

describe('notFoundHandler middleware', () => {
  test('returns 404 with NOT_FOUND code', () => {
    const res = mockRes();
    notFoundHandler(mockReq(), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'NOT_FOUND' })
      })
    );
  });
});

describe('asyncHandler', () => {
  test('calls the wrapped function', async () => {
    const fn = jest.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);

    const req = mockReq();
    const res = mockRes();
    await handler(req, res, mockNext);

    expect(fn).toHaveBeenCalledWith(req, res, mockNext);
  });

  test('catches async errors and passes to next', async () => {
    const error = new Error('async fail');
    const fn = jest.fn().mockRejectedValue(error);
    const handler = asyncHandler(fn);
    const next = jest.fn();

    await handler(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
