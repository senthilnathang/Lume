import { responseUtil } from '../../src/shared/utils/index.js';
import { errorHandler, notFoundHandler } from '../../src/core/middleware/errorHandler.js';

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

describe('error envelope (F6.4)', () => {
  test('error bodies carry requestId and timestamp meta', () => {
    const res = mockRes();
    errorHandler({ message: 'boom', code: 'E_X' }, { id: 'req-1' }, res, () => {});
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'E_X', message: 'boom' },
      requestId: 'req-1',
    });
    expect(typeof res.body.timestamp).toBe('string');
  });

  test('notFound keeps the legacy shape without meta', () => {
    const res = mockRes();
    notFoundHandler({}, res);
    expect(res.statusCode).toBe(404);
    expect(res.body.requestId).toBeUndefined();
  });

  test('responseUtil.error merges optional meta', () => {
    expect(responseUtil.error('x')).toEqual({ success: false, error: { code: 'ERROR', message: 'x' } });
    expect(responseUtil.error('x', null, 'E', { requestId: 'r' }).requestId).toBe('r');
  });
});
