// src/config/env.js
// Validates runtime environment configuration to ensure fail-fast guarantees
// for critical operational parameters like database connectivity and auth secrets.

function validateEnv() {
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missingVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName] || process.env[varName].trim() === '') {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error(`\n[CRITICAL ERROR] Application configuration validation failed.`);
    console.error(`Missing required environment variable(s): ${missingVars.join(', ')}`);
    console.error(`Please verify your backend/.env configuration file exists and contains valid credentials.\n`);
    
    // Ensure clean fast-failure outside of test runner harnesses
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }

  // Enforce secure cryptography standard warnings
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn(`\n[SECURITY WARNING] Weak JWT_SECRET detected.`);
    console.warn(`Production keys should utilize minimum 32-byte cryptographically random string representations.`);
    console.warn(`Recommended rotation via: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"\n`);
  }
}

module.exports = { validateEnv };
