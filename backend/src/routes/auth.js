// src/routes/auth.js
// Authentication routes: register, login, logout, me, firebase (OAuth sync)

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const { getFirebaseAdmin } = require('../config/firebase');

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
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
}

// ─────────────────────────────────────────────
// POST /api/auth/firebase
// Called by the frontend after any Firebase sign-in (Google or email/password).
// Body: { idToken: string, institution?: string }
//
// Flow:
//   1. Verify the Firebase ID token using Admin SDK
//   2. Find the user in PostgreSQL by firebase_uid (or email for legacy accounts)
//   3. If no user exists, create one (using name/photo from Firebase)
//   4. Issue our own JWT cookie so all existing protected routes keep working
//   5. Return the DB user object
// ─────────────────────────────────────────────
router.post('/firebase', async (req, res) => {
  try {
    const { idToken, institution = '' } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    // 1. Verify token with Firebase Admin
    let decoded;
    try {
      const admin = getFirebaseAdmin();
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      console.error('Firebase token verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid or expired Firebase token' });
    }

    const { uid, email, name, picture } = decoded;

    if (!email) {
      return res.status(400).json({ error: 'Firebase account has no email address' });
    }

    const emailNorm = email.toLowerCase().trim();

    // 2. Try to find user by firebase_uid first (returning users)
    let result = await pool.query(
      `SELECT id, email, full_name, institution, bio, avatar_url, firebase_uid, created_at
       FROM users WHERE firebase_uid = $1`,
      [uid]
    );

    // 3a. Found by firebase_uid → update photo if changed
    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Update avatar if Google provided a new one
      if (picture && user.avatar_url !== picture) {
        await pool.query(
          'UPDATE users SET avatar_url = $1 WHERE id = $2',
          [picture, user.id]
        );
        user.avatar_url = picture;
      }

      issueToken(res, user);
      return res.status(200).json({ message: 'Authenticated', user });
    }

    // 3b. Try to find by email (links existing email/password account to Firebase)
    result = await pool.query(
      `SELECT id, email, full_name, institution, bio, avatar_url, firebase_uid, created_at
       FROM users WHERE email = $1`,
      [emailNorm]
    );

    if (result.rows.length > 0) {
      // Link the existing account to Firebase uid
      const user = result.rows[0];
      await pool.query(
        'UPDATE users SET firebase_uid = $1, avatar_url = COALESCE(NULLIF($2,\'\'), avatar_url) WHERE id = $3',
        [uid, picture || '', user.id]
      );
      user.firebase_uid = uid;
      if (picture) user.avatar_url = picture;

      issueToken(res, user);
      return res.status(200).json({ message: 'Authenticated', user });
    }

    // 3c. Brand new user — create the DB record
    const fullName  = (name || emailNorm.split('@')[0]).trim();
    const avatarUrl = picture || '';

    // For email/password Firebase users, password_hash is null (no local password)
    const insertResult = await pool.query(
      `INSERT INTO users
         (email, full_name, institution, avatar_url, firebase_uid, password_hash)
       VALUES ($1, $2, $3, $4, $5, NULL)
       RETURNING id, email, full_name, institution, bio, avatar_url, firebase_uid, created_at`,
      [emailNorm, fullName, institution.trim(), avatarUrl, uid]
    );

    const newUser = insertResult.rows[0];

    issueToken(res, newUser);
    return res.status(201).json({ message: 'Account created', user: newUser });

  } catch (err) {
    console.error('POST /auth/firebase error:', err.message);
    return res.status(500).json({ error: 'Authentication failed: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/register
// Body: { email, password, full_name, institution? }
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, institution = '' } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password, and full_name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, institution)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, institution, bio, avatar_url, created_at`,
      [email.toLowerCase().trim(), password_hash, full_name.trim(), institution.trim()]
    );

    const newUser = result.rows[0];
    issueToken(res, newUser);

    return res.status(201).json({ message: 'Account created successfully', user: newUser });
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

    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, institution, bio, avatar_url, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Firebase-only accounts have no password_hash
    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses Google Sign-In. Please use the Google button to log in.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    issueToken(res, user);

    const { password_hash, ...safeUser } = user;
    return res.status(200).json({ message: 'Logged in successfully', user: safeUser });
  } catch (err) {
    console.error('POST /auth/login error:', err.message);
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/logout
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
// ─────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, institution, bio, avatar_url, firebase_uid, created_at
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
