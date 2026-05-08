// src/db/pool.js
// Single pg connection pool — imported by every route and migration file.

const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in .env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep SSL off for local dev; toggle via env if needed.
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
  process.exit(1);
});

module.exports = pool;
