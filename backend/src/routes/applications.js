// src/routes/applications.js
// Step 6: Application flow
//
// POST   /api/projects/:id/apply          → apply to a project
// GET    /api/projects/:id/applications   → list applications (project owner only)
// PATCH  /api/applications/:id            → accept or reject an application (owner only)
// GET    /api/applications/mine           → list current user's own applications
// GET    /api/notifications               → list current user's notifications
// PATCH  /api/notifications/:id/read     → mark a notification as read

const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ─────────────────────────────────────────────
// Internal helper: create a DB notification
// ─────────────────────────────────────────────
async function createNotification(client, userId, content) {
  await client.query(
    `INSERT INTO notifications (user_id, content) VALUES ($1, $2)`,
    [userId, content]
  );
}

// ─────────────────────────────────────────────
// POST /api/projects/:id/apply
// Body: { message? }
// A user applies to join a project.
// ─────────────────────────────────────────────
router.post('/projects/:id/apply', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Project id must be a number' });

    const { message = '' } = req.body;

    // Fetch project to validate it exists and is still recruiting
    const projResult = await pool.query(
      'SELECT id, owner_id, title, status FROM projects WHERE id = $1',
      [projectId]
    );
    if (projResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projResult.rows[0];

    if (project.owner_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot apply to your own project' });
    }
    if (project.status !== 'recruiting') {
      return res.status(400).json({ error: 'This project is not currently recruiting' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert application (UNIQUE constraint prevents duplicates)
      const appResult = await client.query(
        `INSERT INTO applications (project_id, user_id, message)
         VALUES ($1, $2, $3)
         RETURNING id, project_id, user_id, status, message, created_at`,
        [projectId, req.user.id, message.trim()]
      );

      // Notify the project owner
      const applicantResult = await client.query(
        'SELECT full_name FROM users WHERE id = $1',
        [req.user.id]
      );
      const applicantName = applicantResult.rows[0]?.full_name || 'Someone';
      await createNotification(
        client,
        project.owner_id,
        `${applicantName} applied to join your project "${project.title}"`
      );

      await client.query('COMMIT');
      return res.status(201).json({
        message: 'Application submitted successfully',
        application: appResult.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      // Unique constraint violation = already applied
      if (err.code === '23505') {
        return res.status(409).json({ error: 'You have already applied to this project' });
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST /projects/:id/apply error:', err.message);
    return res.status(500).json({ error: 'Application failed: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/projects/:id/applications
// Returns all applications for a project.
// Only the project owner can see this.
// ─────────────────────────────────────────────
router.get('/projects/:id/applications', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Project id must be a number' });

    // Verify ownership
    const projResult = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );
    if (projResult.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    if (projResult.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the project owner can view applications' });
    }

    const result = await pool.query(
      `SELECT
         a.id, a.status, a.message, a.created_at,
         u.id AS user_id, u.full_name, u.email, u.bio, u.institution, u.avatar_url,
         COALESCE(
           json_agg(
             json_build_object('name', s.name, 'level', us.level, 'category', s.category)
           ) FILTER (WHERE s.id IS NOT NULL),
           '[]'
         ) AS applicant_skills
       FROM applications a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN user_skills us ON us.user_id = u.id
       LEFT JOIN skills s ON s.id = us.skill_id
       WHERE a.project_id = $1
       GROUP BY a.id, u.id
       ORDER BY a.created_at DESC`,
      [projectId]
    );

    return res.status(200).json({ applications: result.rows });
  } catch (err) {
    console.error('GET /projects/:id/applications error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch applications: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/applications/:id
// Body: { status: 'accepted' | 'rejected' }
// Only the project owner can accept/reject.
// ─────────────────────────────────────────────
router.patch('/applications/:id', async (req, res) => {
  try {
    const appId = parseInt(req.params.id, 10);
    if (isNaN(appId)) return res.status(400).json({ error: 'Application id must be a number' });

    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be "accepted" or "rejected"' });
    }

    // Fetch application with project info for ownership check
    const appResult = await pool.query(
      `SELECT a.id, a.user_id, a.project_id, a.status AS current_status,
              p.owner_id, p.title AS project_title,
              u.full_name AS applicant_name
       FROM applications a
       JOIN projects p ON p.id = a.project_id
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [appId]
    );

    if (appResult.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    const app = appResult.rows[0];

    if (app.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the project owner can update application status' });
    }
    if (app.current_status !== 'pending') {
      return res.status(400).json({ error: 'This application has already been decided' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update application status
      const updated = await client.query(
        `UPDATE applications SET status = $1 WHERE id = $2
         RETURNING id, project_id, user_id, status, message, created_at`,
        [status, appId]
      );

      // Notify the applicant
      const notifMsg = status === 'accepted'
        ? `🎉 Your application to "${app.project_title}" was accepted! You're on the team.`
        : `Your application to "${app.project_title}" was not selected this time.`;
      await createNotification(client, app.user_id, notifMsg);

      await client.query('COMMIT');
      return res.status(200).json({
        message: `Application ${status}`,
        application: updated.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('PATCH /applications/:id error:', err.message);
    return res.status(500).json({ error: 'Failed to update application: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/applications/mine
// Returns all applications made by the current user.
// ─────────────────────────────────────────────
router.get('/applications/mine', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         a.id, a.status, a.message, a.created_at,
         p.id AS project_id, p.title, p.description, p.status AS project_status,
         u.full_name AS owner_name
       FROM applications a
       JOIN projects p ON p.id = a.project_id
       JOIN users u ON u.id = p.owner_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ applications: result.rows });
  } catch (err) {
    console.error('GET /applications/mine error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch applications: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/notifications
// Returns all notifications for the current user.
// ─────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, content, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const unreadCount = result.rows.filter(n => !n.is_read).length;
    return res.status(200).json({ notifications: result.rows, unread_count: unreadCount });
  } catch (err) {
    console.error('GET /notifications error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch notifications: ' + err.message });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/notifications/:id/read
// Marks a single notification as read.
// ─────────────────────────────────────────────
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (isNaN(notifId)) return res.status(400).json({ error: 'Notification id must be a number' });

    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_read`,
      [notifId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('PATCH /notifications/:id/read error:', err.message);
    return res.status(500).json({ error: 'Failed to update notification: ' + err.message });
  }
});

module.exports = router;
