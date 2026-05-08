// src/routes/auth.js
// Authentication routes: register, login, logout, me

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────
// Helper: issue a JWT and set it as HTTP-only cookie
// ─────────────────────────────────────────────
function issueToken(res, user) {
  const payload = { id: user.id, email: user.email };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.cookie('token', token, {
    httpOnly: true,                              // inaccessible to JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,           // 7 days in ms
  });

  return token;
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// Body: { email, password, full_name, institution? }
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, institution = '' } = req.body;

    // Basic field validation
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password, and full_name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if email already in use
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    // Hash password (salt rounds = 12)
    const password_hash = await bcrypt.hash(password, 12);

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, institution)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, institution, bio, avatar_url, created_at`,
      [email.toLowerCase().trim(), password_hash, full_name.trim(), institution.trim()]
    );

    const newUser = result.rows[0];

    // Issue JWT cookie immediately so user is logged in after registering
    issueToken(res, newUser);

    return res.status(201).json({
      message: 'Account created successfully',
      user: newUser,
    });
  } catch (err) {
    console.error('POST /auth/register error:', err.message);
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Fetch user by email
    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, institution, bio, avatar_url, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      // Use a generic message to avoid user enumeration
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Compare against stored hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Issue JWT cookie
    issueToken(res, user);

    // Never return password_hash in response
    const { password_hash, ...safeUser } = user;

    return res.status(200).json({
      message: 'Logged in successfully',
      user: safeUser,
    });
  } catch (err) {
    console.error('POST /auth/login error:', err.message);
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/logout
// Clears the auth cookie
// ─────────────────────────────────────────────
router.get('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  return res.status(200).json({ message: 'Logged out successfully' });
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// Returns currently authenticated user's profile.
// Protected — requires a valid JWT cookie.
// ─────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, institution, bio, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error('GET /auth/me error:', err.message);
    return res.status(500).json({ error: 'Could not fetch user: ' + err.message });
  }
});

module.exports = router;
