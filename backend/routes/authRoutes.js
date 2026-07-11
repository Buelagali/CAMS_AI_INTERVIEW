const express = require('express');
const router = express.Router();
const { generateToken } = require('../middleware/auth');
const { getSession } = require('../utils/sessionStore');

router.post('/token', async (req, res) => {
  const { sessionId, name, email, role } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const token = generateToken({
    sessionId,
    name: name || session.name,
    email: email || session.email,
    role: role || session.role,
  });

  res.json({ token, expiresIn: '2h' });
});

router.post('/verify', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const { verifyToken } = require('../middleware/auth');
    const decoded = verifyToken(token);
    const session = await getSession(decoded.sessionId);
    res.json({
      valid: true,
      sessionId: decoded.sessionId,
      sessionExists: !!session,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
    });
  } catch (err) {
    res.json({ valid: false, error: err.message });
  }
});

module.exports = router;
