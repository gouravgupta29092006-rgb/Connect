// src/server.js
// Entry point for the CONNECT Express monolith.

require('dotenv').config();
const { validateEnv } = require('./config/env');
validateEnv();

const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { Server } = require('socket.io');

const testRouter          = require('./routes/test');
const authRouter          = require('./routes/auth');
const usersRouter         = require('./routes/users');
const skillsRouter        = require('./routes/skills');
const projectsRouter      = require('./routes/projects');
const aiRouter            = require('./routes/ai');
const applicationsRouter  = require('./routes/applications');
const chatRouter          = require('./routes/chat');
const { initSocket }      = require('./socket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ─── Socket.io ────────────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});
initSocket(io);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ─── Routes ──────────────────────────────────────────────────────────────────

// Step 1
app.use('/api', testRouter);

// Step 2
app.use('/api/auth', authRouter);

// Step 3
app.use('/api/users', usersRouter);
app.use('/api/skills', skillsRouter);

// Step 4
app.use('/api/projects', projectsRouter);

// Steps 5 & 8 — AI
app.use('/api/ai', aiRouter);

// Step 6 — Applications & Notifications
app.use('/api', applicationsRouter);

// Step 7 — Chat (REST history endpoint)
app.use('/api/chat', chatRouter);

// ─── 404 catch-all ───────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`🚀  CONNECT backend running on http://localhost:${PORT}`);
  console.log(`    Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`    Socket.io:   ready`);
});

module.exports = { app, server, io };
