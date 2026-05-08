// src/routes/chat.js
// Step 7: REST endpoints for chat history
// GET  /api/chat/:projectId/messages   → fetch message history for a project room
// (Real-time message sending happens via Socket.io in src/socket.js)

const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /api/chat/:projectId/messages
// Returns the last N messages for a project.
// Query: limit (default 50), before (message id for pagination)
// ─────────────────────────────────────────────
router.get('/:projectId/messages', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId)) return res.status(400).json({ error: 'projectId must be a number' });

    // Verify the project exists
    const projCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [projectId]);
    if (projCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { limit = 50, before } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 50, 100);

    let result;
    if (before) {
      const beforeId = parseInt(before, 10);
      result = await pool.query(
        `SELECT m.id, m.content, m.created_at,
                u.id AS sender_id, u.full_name AS sender_name, u.avatar_url AS sender_avatar
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.project_id = $1 AND m.id < $2
         ORDER BY m.created_at DESC
         LIMIT $3`,
        [projectId, beforeId, parsedLimit]
      );
    } else {
      result = await pool.query(
        `SELECT m.id, m.content, m.created_at,
                u.id AS sender_id, u.full_name AS sender_name, u.avatar_url AS sender_avatar
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.project_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2`,
        [projectId, parsedLimit]
      );
    }

    // Return in chronological order (oldest first)
    return res.status(200).json({ messages: result.rows.reverse() });
  } catch (err) {
    console.error('GET /chat/:projectId/messages error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch messages: ' + err.message });
  }
});

module.exports = router;
