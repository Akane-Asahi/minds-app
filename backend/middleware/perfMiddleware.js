/**
 * Request timing middleware. Logs method, route, status, duration_ms.
 * Only active when DEBUG_PERF=true. No PII; never logs tokens or auth headers.
 */
function perfMiddleware(req, res, next) {
  if (process.env.DEBUG_PERF !== 'true') return next();

  const start = Date.now();
  const method = (req.method || '').toUpperCase();
  const route = (req.originalUrl || req.url || '').split('?')[0] || '/';

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const status = res.statusCode;
    const safeRoute = route || '/';
    const logLine = `[PERF] ${method} ${safeRoute} ${status} ${durationMs}ms`;
    if (durationMs > 2000) {
      console.warn(logLine + ' (slow)');
    } else {
      console.warn(logLine);
    }
  });

  next();
}

module.exports = perfMiddleware;
