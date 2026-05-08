// src/middleware/auth.js
// Verifies the JWT from the HTTP-only cookie.
// Attach to any route that requires authentication.

const jwt = require('jsonwebtoken');
require('dotenv').config();

function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated — no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the decoded payload to req so route handlers can read req.user
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch (err) {
    // Token is expired or tampered with
    return res.status(401).json({ error: 'Not authenticated — invalid or expired token' });
  }
}

module.exports = authMiddleware;
