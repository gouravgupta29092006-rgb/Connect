// src/routes/users.js
// Step 3: Profile management
// GET  /api/users/profile        → get own full profile including skills
// PUT  /api/users/profile        → update bio, institution, avatar_url, full_name

const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes in this file require authentication
router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /api/users/profile
// Returns the authenticated user's full profile + their assigned skills.
// ─────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    // Fetch core user data
    const userResult = await pool.query(
      `SELECT id, email, full_name, bio, institution, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch all skills assigned to this user with level
    const skillsResult = await pool.query(
      `SELECT s.id, s.name, s.category, us.level
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id = $1
       ORDER BY us.level DESC, s.name ASC`,
      [req.user.id]
    );

    return res.status(200).json({
      profile: {
        ...userResult.rows[0],
        skills: skillsResult.rows,
      },
    });
  } catch (err) {
    console.error('GET /users/profile error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch profile: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/users/profile
// Body: any subset of { full_name, bio, institution, avatar_url }
// Only updates fields that are provided.
// ─────────────────────────────────────────────
router.put('/profile', async (req, res) => {
  try {
    const { full_name, bio, institution, avatar_url } = req.body;

    // Build dynamic SET clause — only update provided fields
    const fields = [];
    const values = [];
    let idx = 1;

    if (full_name !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(full_name.trim());
    }
    if (bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(bio.trim());
    }
    if (institution !== undefined) {
      fields.push(`institution = $${idx++}`);
      values.push(institution.trim());
    }
    if (avatar_url !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(avatar_url.trim());
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    // Append the WHERE clause parameter
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, email, full_name, bio, institution, avatar_url, created_at`,
      values
    );

    return res.status(200).json({
      message: 'Profile updated',
      profile: result.rows[0],
    });
  } catch (err) {
    console.error('PUT /users/profile error:', err.message);
    return res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/users/engineers
// Lists all users with their assigned skills.
// Query: search? (filters by name, institution, or skill name)
// Used by the Engineers tab on the projects discovery page.
// ─────────────────────────────────────────────
router.get('/engineers', async (req, res) => {
  try {
    const { search } = req.query;

    let query;
    let values;

    if (search && search.trim()) {
      const pattern = `%${search.trim()}%`;
      query = `
        SELECT DISTINCT
          u.id, u.full_name, u.institution, u.bio, u.avatar_url, u.created_at,
          COALESCE(
            json_agg(
              json_build_object('id', s.id, 'name', s.name, 'category', s.category, 'level', us.level)
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) AS skills
        FROM users u
        LEFT JOIN user_skills us ON us.user_id = u.id
        LEFT JOIN skills s ON s.id = us.skill_id
        WHERE
          u.full_name ILIKE $1
          OR u.institution ILIKE $1
          OR s.name ILIKE $1
        GROUP BY u.id
        ORDER BY u.full_name ASC
        LIMIT 50`;
      values = [pattern];
    } else {
      query = `
        SELECT
          u.id, u.full_name, u.institution, u.bio, u.avatar_url, u.created_at,
          COALESCE(
            json_agg(
              json_build_object('id', s.id, 'name', s.name, 'category', s.category, 'level', us.level)
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) AS skills
        FROM users u
        LEFT JOIN user_skills us ON us.user_id = u.id
        LEFT JOIN skills s ON s.id = us.skill_id
        GROUP BY u.id
        ORDER BY u.full_name ASC
        LIMIT 50`;
      values = [];
    }

    const result = await pool.query(query, values);
    return res.status(200).json({ engineers: result.rows });
  } catch (err) {
    console.error('GET /users/engineers error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch engineers: ' + err.message });
  }
});

module.exports = router;
