import { dateUtil } from '../../shared/utils/index.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: dateUtil.now(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    if (req.user) {
      logData.userId = req.user.id;
    }

    if (res.statusCode >= 400) {
      console.error('Request Error:', JSON.stringify(logData));
    } else {
      console.log('Request:', JSON.stringify(logData));
    }
  });

  next();
};

export const bodyLogger = (req, res, next) => {
  const originalSend = res.send;

  res.send = function(body) {
    req.responseBody = body;
    return originalSend.apply(this, arguments);
  };

  next();
};

export default {
  requestLogger,
  bodyLogger
};
