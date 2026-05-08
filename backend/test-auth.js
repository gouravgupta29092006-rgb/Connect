// test-auth.js — run with: node test-auth.js
// Tests register → login → /me → unauthenticated /me → logout → /me (should 401)

const http = require('http');
const { BASE, TEST_USER } = require('./test-config');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: JSON.parse(data),
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  return setCookie[0].split(';')[0];
}

async function runTests() {
  let cookie = null;
  let passed = 0;
  let failed = 0;

  function assert(label, condition, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${label}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${label} ${detail}`);
      failed++;
    }
  }

  // ── TEST 1: POST /api/test-db ──────────────────────────────────────────────
  console.log('\n[Step 1] POST /api/test-db');
  const t1 = await request({ ...BASE, method: 'POST', path: '/api/test-db', headers: {} });
  assert('Status 200', t1.status === 200, `got ${t1.status}`);
  assert('Has server_time', !!t1.body.server_time);

  // ── TEST 2: POST /api/auth/register ───────────────────────────────────────
  console.log('\n[Step 2a] POST /api/auth/register');
  const regBody = JSON.stringify(TEST_USER);
  const t2 = await request(
    { ...BASE, method: 'POST', path: '/api/auth/register', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(regBody) } },
    regBody
  );
  assert('Status 201 or 409', t2.status === 201 || t2.status === 409, `got ${t2.status}`);
  if (t2.status === 201) {
    assert('No password_hash in response', !t2.body.user?.password_hash);
    assert('Has user id', !!t2.body.user?.id);
    cookie = extractCookie(t2.headers);
    assert('Set-Cookie header present', !!cookie);
  }

  // ── TEST 3: POST /api/auth/login ──────────────────────────────────────────
  console.log('\n[Step 2b] POST /api/auth/login');
  const loginBody = JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password });
  const t3 = await request(
    { ...BASE, method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) } },
    loginBody
  );
  assert('Status 200', t3.status === 200, `got ${t3.status}`);
  assert('Message = Logged in successfully', t3.body.message === 'Logged in successfully');
  assert('No password_hash in response', !t3.body.user?.password_hash);
  cookie = extractCookie(t3.headers);
  assert('Set-Cookie header present on login', !!cookie);

  // ── TEST 4: GET /api/auth/me (with cookie) ────────────────────────────────
  console.log('\n[Step 2c] GET /api/auth/me (authenticated)');
  const t4 = await request({
    ...BASE, method: 'GET', path: '/api/auth/me',
    headers: { Cookie: cookie },
  });
  assert('Status 200', t4.status === 200, `got ${t4.status}`);
  assert('Returns user object', !!t4.body.user?.email);
  assert('Correct email', t4.body.user?.email === TEST_USER.email);

  // ── TEST 5: GET /api/auth/me (no cookie → 401) ────────────────────────────
  console.log('\n[Step 2d] GET /api/auth/me (unauthenticated)');
  const t5 = await request({ ...BASE, method: 'GET', path: '/api/auth/me', headers: {} });
  assert('Status 401', t5.status === 401, `got ${t5.status}`);
  assert('Error message present', !!t5.body.error);

  // ── TEST 6: Wrong password → 401 ──────────────────────────────────────────
  console.log('\n[Step 2e] POST /api/auth/login (wrong password)');
  const badBody = JSON.stringify({ email: TEST_USER.email, password: 'wrongpass' });
  const t6 = await request(
    { ...BASE, method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(badBody) } },
    badBody
  );
  assert('Status 401', t6.status === 401, `got ${t6.status}`);

  // ── TEST 7: GET /api/auth/logout ──────────────────────────────────────────
  console.log('\n[Step 2f] GET /api/auth/logout');
  const t7 = await request({ ...BASE, method: 'GET', path: '/api/auth/logout', headers: { Cookie: cookie } });
  assert('Status 200', t7.status === 200, `got ${t7.status}`);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('🎉  All tests passed — Steps 1 & 2 verified!');
  else console.log('⚠️   Some tests failed — check output above.');
}

runTests().catch((err) => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
