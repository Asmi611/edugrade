/**
 * Authentication middleware.
 * --------------------------
 * Exports:
 *   - authMiddleware:   verifies the `Authorization: Bearer <jwt>` header,
 *                       attaches the decoded payload to `req.user`.
 *   - requireRole(...): rejects requests whose user does not have one of
 *                       the allowed roles. Must be used AFTER authMiddleware.
 *
 * Token payload shape (set in routes/auth.js):
 *   { id, name, email, role }
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret';

if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    '[edugrade-api] WARNING: JWT_SECRET is not set — using an insecure dev fallback. Do NOT run this in production.'
  );
}

/**
 * Verifies the Bearer token and attaches `req.user`.
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expired ? 'Token expired' : 'Invalid token',
    });
  }
}

/**
 * Higher-order middleware that allows requests only for the listed roles.
 * Example:  router.get('/admin/users', authMiddleware, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    return next();
  };
}

module.exports = { authMiddleware, requireRole, JWT_SECRET };
