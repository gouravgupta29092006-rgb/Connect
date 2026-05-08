// src/routes/test.js
// Step 1 verification route: POST /api/test-db

const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// POST /api/test-db
// Runs a trivial query to confirm the DB connection is alive.
router.post('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time');
    res.status(200).json({
      message: 'Database connection successful',
      server_time: result.rows[0].server_time,
    });
  } catch (err) {
    console.error('DB test failed:', err.message);
    res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }
});

module.exports = router;
