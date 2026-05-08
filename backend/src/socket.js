// src/socket.js
// Step 7: Socket.io integration for real-time project chat.
//
// Events:
//   Client → Server:
//     'join_room'     { projectId }           → joins the room for a project
//     'leave_room'    { projectId }           → leaves the room
//     'send_message'  { projectId, content }  → sends a message (persisted to DB)
//
//   Server → Client:
//     'new_message'   { id, content, sender_id, sender_name, sender_avatar, created_at }
//     'user_joined'   { userId, fullName, projectId }
//     'user_left'     { userId, fullName, projectId }
//     'error'         { message }

const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const pool = require('./db/pool');
require('dotenv').config();

function initSocket(io) {
  // ── Auth middleware for Socket.io ──────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) return next(new Error('Not authenticated — no cookie'));

      const parsed = cookie.parse(rawCookie);
      const token = parsed.token;
      if (!token) return next(new Error('Not authenticated — no token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, email: decoded.email };
      next();
    } catch (err) {
      next(new Error('Not authenticated — invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌  Socket connected: user ${socket.user.id}`);

    // ── join_room ─────────────────────────────────────────────────────────
    socket.on('join_room', async ({ projectId }) => {
      try {
        if (!projectId) return socket.emit('error', { message: 'projectId is required' });

        const room = `project_${projectId}`;
        socket.join(room);

        // Fetch user name for the join broadcast
        const userResult = await pool.query(
          'SELECT full_name FROM users WHERE id = $1',
          [socket.user.id]
        );
        const fullName = userResult.rows[0]?.full_name || 'Unknown';

        socket.to(room).emit('user_joined', {
          userId: socket.user.id,
          fullName,
          projectId,
        });

        console.log(`   User ${socket.user.id} joined room ${room}`);
      } catch (err) {
        console.error('join_room error:', err.message);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ── leave_room ────────────────────────────────────────────────────────
    socket.on('leave_room', async ({ projectId }) => {
      try {
        if (!projectId) return;

        const room = `project_${projectId}`;
        socket.leave(room);

        const userResult = await pool.query(
          'SELECT full_name FROM users WHERE id = $1',
          [socket.user.id]
        );
        const fullName = userResult.rows[0]?.full_name || 'Unknown';

        socket.to(room).emit('user_left', {
          userId: socket.user.id,
          fullName,
          projectId,
        });
      } catch (err) {
        console.error('leave_room error:', err.message);
      }
    });

    // ── send_message ──────────────────────────────────────────────────────
    socket.on('send_message', async ({ projectId, content }) => {
      try {
        if (!projectId || !content || !content.trim()) {
          return socket.emit('error', { message: 'projectId and content are required' });
        }

        // Persist the message to DB
        const insertResult = await pool.query(
          `INSERT INTO messages (project_id, sender_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, content, created_at`,
          [projectId, socket.user.id, content.trim()]
        );
        const saved = insertResult.rows[0];

        // Fetch sender info
        const userResult = await pool.query(
          'SELECT full_name, avatar_url FROM users WHERE id = $1',
          [socket.user.id]
        );
        const user = userResult.rows[0] || {};

        const messagePayload = {
          id: saved.id,
          content: saved.content,
          sender_id: socket.user.id,
          sender_name: user.full_name || 'Unknown',
          sender_avatar: user.avatar_url || '',
          created_at: saved.created_at,
        };

        // Broadcast to the entire room (including sender)
        const room = `project_${projectId}`;
        io.to(room).emit('new_message', messagePayload);
      } catch (err) {
        console.error('send_message error:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌  Socket disconnected: user ${socket.user.id}`);
    });
  });
}

module.exports = { initSocket };
