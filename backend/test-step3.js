// test-step3.js — run with: node test-step3.js
// Tests Step 3: Profile management + skill assignment

const http = require('http');
const { BASE, TEST_USER } = require('./test-config');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function extractCookie(headers) {
  const sc = headers['set-cookie'];
  return sc ? sc[0].split(';')[0] : null;
}

async function runTests() {
  let passed = 0, failed = 0;
  let cookie, skillId1, skillId2;

  function assert(label, condition, detail = '') {
    if (condition) { console.log(`  ✅ PASS: ${label}`); passed++; }
    else { console.log(`  ❌ FAIL: ${label} ${detail}`); failed++; }
  }

  // Login
  const loginBody = JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password });
  const lr = await request({ ...BASE, method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) } }, loginBody);
  cookie = extractCookie(lr.headers);
  if (!cookie) { console.error('Login failed'); process.exit(1); }
  console.log(`🔑  Logged in as ${TEST_USER.email}\n`);

  // ── TEST 1: GET /api/users/profile ────────────────────────────────────────
  console.log('[Step 3a] GET /api/users/profile');
  const t1 = await request({ ...BASE, method: 'GET', path: '/api/users/profile', headers: { Cookie: cookie } });
  assert('Status 200', t1.status === 200, `got ${t1.status}`);
  assert('Has profile.email', !!t1.body.profile?.email);
  assert('Has profile.skills array', Array.isArray(t1.body.profile?.skills));

  // ── TEST 2: PUT /api/users/profile ────────────────────────────────────────
  console.log('\n[Step 3b] PUT /api/users/profile');
  const updateBody = JSON.stringify({ bio: 'Full-stack developer passionate about AI', institution: 'IIT Bombay', github_url: 'https://github.com/testuser' });
  const t2 = await request({ ...BASE, method: 'PUT', path: '/api/users/profile', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updateBody), Cookie: cookie } }, updateBody);
  assert('Status 200', t2.status === 200, `got ${t2.status}`);
  assert('Bio updated', t2.body.profile?.bio === 'Full-stack developer passionate about AI');
  assert('Institution updated', t2.body.profile?.institution === 'IIT Bombay');

  // ── TEST 3: PUT empty body → 400 ─────────────────────────────────────────
  console.log('\n[Step 3c] PUT /api/users/profile (empty body → 400)');
  const t3 = await request({ ...BASE, method: 'PUT', path: '/api/users/profile', headers: { 'Content-Type': 'application/json', 'Content-Length': '2', Cookie: cookie } }, '{}');
  assert('Status 400', t3.status === 400, `got ${t3.status}`);

  // ── TEST 4: GET /api/skills ───────────────────────────────────────────────
  console.log('\n[Step 3d] GET /api/skills');
  const t4 = await request({ ...BASE, method: 'GET', path: '/api/skills', headers: { Cookie: cookie } });
  assert('Status 200', t4.status === 200, `got ${t4.status}`);
  assert('Has skills array', Array.isArray(t4.body.skills));
  assert('Skills seeded (>10)', t4.body.skills.length > 10, `got ${t4.body.skills.length}`);
  assert('Has grouped object', !!t4.body.grouped && typeof t4.body.grouped === 'object');
  skillId1 = t4.body.skills[0].id;
  skillId2 = t4.body.skills[1].id;

  // ── TEST 5: POST /api/skills/assign ───────────────────────────────────────
  console.log('\n[Step 3e] POST /api/skills/assign');
  const assignBody = JSON.stringify({ skills: [{ skill_id: skillId1, level: 4, importance: 5 }, { skill_id: skillId2, level: 3, importance: 4 }] });
  const t5 = await request({ ...BASE, method: 'POST', path: '/api/skills/assign', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(assignBody), Cookie: cookie } }, assignBody);
  assert('Status 200', t5.status === 200, `got ${t5.status}`);
  assert('Returns updated skills', Array.isArray(t5.body.skills));
  assert('Correct skill count (≥2)', t5.body.skills.length >= 2, `got ${t5.body.skills.length}`);

  // ── TEST 6: GET profile after assign ──────────────────────────────────────
  console.log('\n[Step 3f] GET /api/users/profile (after skill assign)');
  const t6 = await request({ ...BASE, method: 'GET', path: '/api/users/profile', headers: { Cookie: cookie } });
  assert('Status 200', t6.status === 200, `got ${t6.status}`);
  assert('Profile.skills populated', t6.body.profile?.skills?.length >= 2);

  // ── TEST 7: Assign invalid level → 400 ───────────────────────────────────
  console.log('\n[Step 3g] POST /api/skills/assign (invalid level → 400)');
  const badAssign = JSON.stringify({ skills: [{ skill_id: skillId1, level: 99 }] });
  const t7 = await request({ ...BASE, method: 'POST', path: '/api/skills/assign', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(badAssign), Cookie: cookie } }, badAssign);
  assert('Status 400', t7.status === 400, `got ${t7.status}`);

  // ── TEST 8: DELETE /api/skills/:skillId ───────────────────────────────────
  console.log('\n[Step 3h] DELETE /api/skills/:skillId');
  const t8 = await request({ ...BASE, method: 'DELETE', path: `/api/skills/${skillId2}`, headers: { Cookie: cookie } });
  assert('Status 200', t8.status === 200, `got ${t8.status}`);

  // ── TEST 9: DELETE again → 404 ───────────────────────────────────────────
  console.log('\n[Step 3i] DELETE /api/skills/:skillId (not assigned → 404)');
  const t9 = await request({ ...BASE, method: 'DELETE', path: `/api/skills/${skillId2}`, headers: { Cookie: cookie } });
  assert('Status 404', t9.status === 404, `got ${t9.status}`);

  // ── TEST 10: No cookie → 401 ─────────────────────────────────────────────
  console.log('\n[Step 3j] GET /api/users/profile (no cookie → 401)');
  const t10 = await request({ ...BASE, method: 'GET', path: '/api/users/profile', headers: {} });
  assert('Status 401', t10.status === 401, `got ${t10.status}`);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('🎉  All tests passed — Step 3 verified!');
  else console.log('⚠️   Some tests failed.');
}

runTests().catch(err => { console.error('Test error:', err.message); process.exit(1); });
