// src/routes/skills.js
// Step 3: Skills management
// GET  /api/skills               → list all available skills (for dropdowns)
// POST /api/skills/assign        → bulk-assign skills to the authenticated user
// DELETE /api/skills/:skillId    → remove a skill from the authenticated user

const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes in this file require authentication
router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /api/skills
// Returns all skills in the system, grouped by category.
// Used by the frontend to populate skill-picker dropdowns.
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, category FROM skills ORDER BY category ASC, name ASC`
    );

    // Group by category for convenience
    const grouped = result.rows.reduce((acc, skill) => {
      if (!acc[skill.category]) acc[skill.category] = [];
      acc[skill.category].push({ id: skill.id, name: skill.name });
      return acc;
    }, {});

    return res.status(200).json({ skills: result.rows, grouped });
  } catch (err) {
    console.error('GET /skills error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch skills: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/skills/assign
// Body: { skills: [{ skill_id: number, level: 1-5 }, ...] }
// Upserts all provided skill assignments for the authenticated user.
// Existing skills are updated, new ones are inserted.
// ─────────────────────────────────────────────
router.post('/assign', async (req, res) => {
  try {
    const { skills } = req.body;

    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ error: 'skills must be a non-empty array of { skill_id, level }' });
    }

    // Validate every entry before touching the DB
    for (const s of skills) {
      if (!s.skill_id || typeof s.skill_id !== 'number') {
        return res.status(400).json({ error: `Invalid skill_id: ${s.skill_id}` });
      }
      if (!s.level || s.level < 1 || s.level > 5) {
        return res.status(400).json({ error: `level must be between 1 and 5, got: ${s.level}` });
      }
    }

    // Run all upserts inside a single transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const s of skills) {
        await client.query(
          `INSERT INTO user_skills (user_id, skill_id, level)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, skill_id)
           DO UPDATE SET level = EXCLUDED.level`,
          [req.user.id, s.skill_id, s.level]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Return the updated skill list for this user
    const updated = await pool.query(
      `SELECT s.id, s.name, s.category, us.level
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id = $1
       ORDER BY us.level DESC, s.name ASC`,
      [req.user.id]
    );

    return res.status(200).json({
      message: `${skills.length} skill(s) assigned successfully`,
      skills: updated.rows,
    });
  } catch (err) {
    console.error('POST /skills/assign error:', err.message);
    return res.status(500).json({ error: 'Failed to assign skills: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/skills/:skillId
// Removes a specific skill from the authenticated user's profile.
// ─────────────────────────────────────────────
router.delete('/:skillId', async (req, res) => {
  try {
    const skillId = parseInt(req.params.skillId, 10);

    if (isNaN(skillId)) {
      return res.status(400).json({ error: 'skillId must be a number' });
    }

    const result = await pool.query(
      `DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2`,
      [req.user.id, skillId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Skill not found on your profile' });
    }

    return res.status(200).json({ message: 'Skill removed from profile' });
  } catch (err) {
    console.error('DELETE /skills/:skillId error:', err.message);
    return res.status(500).json({ error: 'Failed to remove skill: ' + err.message });
  }
});

module.exports = router;
