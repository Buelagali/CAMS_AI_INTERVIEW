const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cams-dev-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '2h';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  if (process.env.NODE_ENV !== 'production' && process.env.JWT_DISABLED === 'true') {
    req.sessionId = req.headers['x-session-id'] || null;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    req.sessionId = decoded.sessionId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  if (process.env.NODE_ENV !== 'production' && process.env.JWT_DISABLED === 'true') {
    req.sessionId = req.headers['x-session-id'] || req.params.sessionId || null;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      req.sessionId = decoded.sessionId;
    } catch {
      // optional auth failures don't block
    }
  }
  if (!req.sessionId) {
    req.sessionId = req.params.sessionId || null;
  }
  next();
}

module.exports = { generateToken, verifyToken, authMiddleware, optionalAuth };
