// scripts/check-secrets.js
// Pre-commit verification scanner enforcing security boundary policies.
// Intercepts commit attempts if files contain real plaintext API keys or raw secrets.

const fs = require('fs');
const { execSync } = require('child_process');

function checkSecrets() {
  try {
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0 && fs.existsSync(f) && fs.lstatSync(f).isFile());

    const sensitivePatterns = [
      { regex: /GEMINI_API_KEY\s*=\s*AIza[0-9A-Za-z-_]{35}/i, label: 'Real Google Gemini API Key' },
      { regex: /DATABASE_URL\s*=\s*postgresql:\/\/[^:]+:[^@]+@(?!(localhost|127\.0\.0\.1)).+/i, label: 'Remote Database Credentials' },
      { regex: /JWT_SECRET\s*=\s*(?!.*(secret|test|change|example|placeholder))[a-zA-Z0-9-_]{32,}/i, label: 'Real Production JWT Secret' }
    ];

    let leakDetected = false;

    for (const filePath of stagedFiles) {
      if (filePath.endsWith('.example') || filePath.endsWith('.md')) {
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      for (const pattern of sensitivePatterns) {
        if (pattern.regex.test(content)) {
          console.error(`\n🚫 [SECURITY VIOLATION] Commit rejected.`);
          console.error(`File: ${filePath}`);
          console.error(`Detected potential plaintext credential risk: ${pattern.label}`);
          console.error(`Please replace sensitive values with secure placeholders before committing.\n`);
          leakDetected = true;
        }
      }
    }

    if (leakDetected) {
      process.exit(1);
    } else {
      console.log('🔒 Pre-commit security scan passed: No leaked credentials detected.');
    }
  } catch (err) {
    console.error('Error executing pre-commit secret scan:', err.message);
    process.exit(1);
  }
}

checkSecrets();
