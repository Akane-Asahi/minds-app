/**
 * Authentication Middleware
 * Verifies JWT tokens and sets req.user.
 * JWT_SECRET must be set in the environment; no fallback is allowed.
 */

const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

const raw = process.env.JWT_SECRET;
if (!raw || String(raw).trim() === '') {
  throw new Error('JWT_SECRET environment variable is required. Set it in .env or the deployment environment.');
}
const JWT_SECRET = raw.trim();

/**
 * Middleware to verify JWT token and set req.user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      if (!decoded || !decoded.sub || typeof decoded.sub !== 'string') return res.status(401).json({ error: 'Not authorized, token failed', code: 'UNAUTHORIZED' });

      // Set user from token payload
      req.user = {
        id: decoded.sub,
        role: decoded.role,
      };

      if (process.env.AUTH_DEBUG === 'true') {
        const headerPid = req.headers['x-participant-id'];
        console.warn(
          `[Auth API] authenticated userId=${req.user.id} participantId=${headerPid ?? 'n/a'}`
        );
      }

      next();
    } catch (error) {
      console.error('[authMiddleware] Token verification failed:', error.message || error);
      return res.status(401).json({ error: 'Not authorized, token failed', code: 'UNAUTHORIZED' });
    }
  } else {
    return res.status(401).json({ error: 'Not authorized, no token', code: 'UNAUTHORIZED' });
  }
});

module.exports = authMiddleware;

