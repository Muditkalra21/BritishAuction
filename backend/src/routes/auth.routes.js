const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Pre-hash the admin password at startup for fast comparison
// In production you'd store a real bcrypt hash in .env
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES = '8h';

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, expiresIn }
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const usernameMatch = username === ADMIN_USERNAME;
  const passwordMatch = password === ADMIN_PASSWORD;

  if (!usernameMatch || !passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  res.json({
    token,
    expiresIn: JWT_EXPIRES,
    user: { username, role: 'admin' },
  });
});

/**
 * GET /api/auth/verify
 * Verifies if the current token is still valid
 */
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
