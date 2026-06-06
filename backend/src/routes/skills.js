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
// Body: { skills: [{ skill_id?, name?, level: string|number }] }
// Accepts string levels: 'beginner'|'intermediate'|'advanced'|'expert'
// OR numeric levels 1-5 for backward compatibility.
// If skill_id is omitted, looks up (or creates) the skill by name.
// ─────────────────────────────────────────────
const LEVEL_MAP = {
  beginner:     1,
  intermediate: 2,
  advanced:     3,
  expert:       4,
  master:       5,
};

router.post('/assign', async (req, res) => {
  try {
    const { skills } = req.body;

    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ error: 'skills must be a non-empty array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const s of skills) {
        // ── Resolve level ──────────────────────────────────────────────────
        let level;
        if (typeof s.level === 'string') {
          level = LEVEL_MAP[s.level.toLowerCase()];
          if (!level) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Unknown level string: ${s.level}. Use beginner|intermediate|advanced|expert` });
          }
        } else if (typeof s.level === 'number') {
          level = s.level;
        } else {
          level = 2; // default to 'intermediate'
        }
        if (level < 1 || level > 5) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `level must be 1-5, got: ${s.level}` });
        }

        // ── Resolve skill_id ───────────────────────────────────────────────
        let skillId = s.skill_id ? parseInt(s.skill_id, 10) : null;

        if (!skillId && s.name) {
          // Look up by name (case-insensitive)
          const existing = await client.query(
            `SELECT id FROM skills WHERE LOWER(name) = LOWER($1)`,
            [s.name.trim()]
          );
          if (existing.rows.length > 0) {
            skillId = existing.rows[0].id;
          } else {
            // Auto-create the skill so users can add custom skills
            const created = await client.query(
              `INSERT INTO skills (name, category) VALUES ($1, $2)
               ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
               RETURNING id`,
              [s.name.trim(), s.category || 'Other']
            );
            skillId = created.rows[0].id;
          }
        }

        if (!skillId) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Each skill must have a skill_id or a name' });
        }

        await client.query(
          `INSERT INTO user_skills (user_id, skill_id, level)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, skill_id)
           DO UPDATE SET level = EXCLUDED.level`,
          [req.user.id, skillId, level]
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

    // Map numeric level back to string for the frontend
    const levelNames = { 1: 'beginner', 2: 'intermediate', 3: 'advanced', 4: 'expert', 5: 'master' };
    const assignedWithNames = updated.rows.map(r => ({
      ...r,
      level: levelNames[r.level] || String(r.level),
    }));

    return res.status(200).json({
      message: `${skills.length} skill(s) assigned successfully`,
      assigned: assignedWithNames,
      skills: assignedWithNames,
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
