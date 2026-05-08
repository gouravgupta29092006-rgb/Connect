// src/routes/projects.js
// Step 4: Project management
// POST /api/projects             → create project (owner only)
// GET  /api/projects             → list projects with optional filters
// GET  /api/projects/:id         → get single project with skills + owner info
// PUT  /api/projects/:id         → update project (owner only)
// DELETE /api/projects/:id       → delete project (owner only)

const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ─────────────────────────────────────────────
// POST /api/projects
// Body: { title, description, status?, skills: [{ skill_id, importance }] }
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, description, status = 'recruiting', skills = [] } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'description is required' });
    }
    if (!['recruiting', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'status must be recruiting, active, or completed' });
    }

    // Validate skills array if provided
    for (const s of skills) {
      if (!s.skill_id || typeof s.skill_id !== 'number') {
        return res.status(400).json({ error: `Invalid skill_id: ${s.skill_id}` });
      }
      if (!s.importance || s.importance < 1 || s.importance > 5) {
        return res.status(400).json({ error: `importance must be 1-5, got: ${s.importance}` });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert project
      const projectResult = await client.query(
        `INSERT INTO projects (owner_id, title, description, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id, owner_id, title, description, status, created_at`,
        [req.user.id, title.trim(), description.trim(), status]
      );
      const project = projectResult.rows[0];

      // Insert project_skills
      for (const s of skills) {
        await client.query(
          `INSERT INTO project_skills (project_id, skill_id, importance)
           VALUES ($1, $2, $3)
           ON CONFLICT (project_id, skill_id) DO UPDATE SET importance = EXCLUDED.importance`,
          [project.id, s.skill_id, s.importance]
        );
      }

      await client.query('COMMIT');

      // Fetch the final project with skills attached
      const fullProject = await getProjectById(project.id);
      return res.status(201).json({ message: 'Project created', project: fullProject });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /projects error:', err.message);
    return res.status(500).json({ error: 'Failed to create project: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/projects
// Query params: status?, skill_id?, search?
// Returns paginated list of projects with required skill names.
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, skill_id, search, limit = 20, offset = 0 } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) {
      conditions.push(`p.status = $${idx++}`);
      values.push(status);
    }
    if (skill_id) {
      conditions.push(`EXISTS (
        SELECT 1 FROM project_skills ps WHERE ps.project_id = p.id AND ps.skill_id = $${idx++}
      )`);
      values.push(parseInt(skill_id, 10));
    }
    if (search) {
      conditions.push(`(p.title ILIKE $${idx} OR p.description ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    values.push(parseInt(limit, 10));
    values.push(parseInt(offset, 10));

    const result = await pool.query(
      `SELECT
         p.id, p.title, p.description, p.status, p.created_at,
         u.id AS owner_id, u.full_name AS owner_name, u.institution AS owner_institution,
         COALESCE(
           json_agg(
             json_build_object('id', s.id, 'name', s.name, 'importance', ps.importance)
           ) FILTER (WHERE s.id IS NOT NULL),
           '[]'
         ) AS skills
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN project_skills ps ON ps.project_id = p.id
       LEFT JOIN skills s ON s.id = ps.skill_id
       ${where}
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    return res.status(200).json({ projects: result.rows });
  } catch (err) {
    console.error('GET /projects error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch projects: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/projects/:id
// Returns full project details with required skills + owner info.
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Project id must be a number' });

    const project = await getProjectById(id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    return res.status(200).json({ project });
  } catch (err) {
    console.error('GET /projects/:id error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch project: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/projects/:id
// Body: any subset of { title, description, status, skills }
// Only the project owner can update.
// ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Project id must be a number' });

    // Check ownership
    const existing = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    if (existing.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the project owner can update this project' });
    }

    const { title, description, status, skills } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title.trim()); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description.trim()); }
    if (status !== undefined) {
      if (!['recruiting', 'active', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      fields.push(`status = $${idx++}`);
      values.push(status);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update project fields if any
      if (fields.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx}`,
          values
        );
      }

      // Replace skills if provided
      if (Array.isArray(skills)) {
        await client.query('DELETE FROM project_skills WHERE project_id = $1', [id]);
        for (const s of skills) {
          await client.query(
            `INSERT INTO project_skills (project_id, skill_id, importance) VALUES ($1, $2, $3)`,
            [id, s.skill_id, s.importance]
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const updated = await getProjectById(id);
    return res.status(200).json({ message: 'Project updated', project: updated });
  } catch (err) {
    console.error('PUT /projects/:id error:', err.message);
    return res.status(500).json({ error: 'Failed to update project: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/projects/:id
// Only the project owner can delete.
// ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Project id must be a number' });

    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND owner_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Project not found or you are not the owner' });
    }

    return res.status(200).json({ message: 'Project deleted' });
  } catch (err) {
    console.error('DELETE /projects/:id error:', err.message);
    return res.status(500).json({ error: 'Failed to delete project: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// Internal helper — fetch one full project with skills + owner
// ─────────────────────────────────────────────
async function getProjectById(id) {
  const result = await pool.query(
    `SELECT
       p.id, p.title, p.description, p.status, p.created_at,
       u.id AS owner_id, u.full_name AS owner_name, u.institution AS owner_institution,
       COALESCE(
         json_agg(
           json_build_object('id', s.id, 'name', s.name, 'category', s.category, 'importance', ps.importance)
         ) FILTER (WHERE s.id IS NOT NULL),
         '[]'
       ) AS skills
     FROM projects p
     JOIN users u ON u.id = p.owner_id
     LEFT JOIN project_skills ps ON ps.project_id = p.id
     LEFT JOIN skills s ON s.id = ps.skill_id
     WHERE p.id = $1
     GROUP BY p.id, u.id`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = router;
