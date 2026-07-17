// middleware/logger.js
const Logger = require('../utilities/Logger');

/**
 * Middleware to log all API requests
 */
const logRequest = async (req, res, next) => {
  // Skip logging for health checks and static files
  if (req.path === '/health' || req.path.startsWith('/assets/')) {
    return next();
  }

  // Store start time
  const start = Date.now();

  // Capture response
  const originalSend = res.send;
  let responseBody;

  res.send = function(data) {
    responseBody = data;
    return originalSend.call(this, data);
  };

  // When response finishes
  res.on('finish', async () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Determine log level based on status
    let type = 'info';
    if (status >= 500) type = 'error';
    else if (status >= 400) type = 'warning';
    else if (status >= 300) type = 'info';

    // Only log if not in development (or always in dev)
    if (process.env.NODE_ENV !== 'production' || status >= 400) {
      await Logger.log({
        type,
        category: 'system',
        message: `${req.method} ${req.path} - ${status} (${duration}ms)`,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          status,
          duration,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        user_id: req.user?.id || null,
      });
    }
  });

  next();
};

/**
 * Middleware to log errors
 */
const logError = (err, req, res, next) => {
  Logger.error(err.message, {
    details: {
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
    },
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
    user_id: req.user?.id || null,
  });

  next(err);
};

module.exports = {
  logRequest,
  logError,
};