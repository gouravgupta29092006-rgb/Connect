// test-steps5-8.js — run with: node test-steps5-8.js
// Tests Step 5 (AI matchmaking) and Step 8 (AI advisor)

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

  function assert(label, condition, detail = '') {
    if (condition) { console.log(`  ✅ PASS: ${label}`); passed++; }
    else { console.log(`  ❌ FAIL: ${label} ${detail}`); failed++; }
  }

  // Login
  const loginBody = JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password });
  const lr = await request({ ...BASE, method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) } }, loginBody);
  const cookie = extractCookie(lr.headers);
  if (!cookie) { console.error('Login failed'); process.exit(1); }

  // Fetch latest project ID
  const projResp = await request({ ...BASE, method: 'GET', path: '/api/projects', headers: { Cookie: cookie } });
  const projects = projResp.body.projects;
  if (!projects || projects.length === 0) { console.error('No projects — run test-step4.js first'); process.exit(1); }
  const projectId = projects[0].id;
  console.log(`🔑  Logged in. Testing with project id=${projectId}: "${projects[0].title}"\n`);

  // ── TEST 1: GET /api/ai/match/:projectId ─────────────────────────────────
  console.log('[Step 5a] GET /api/ai/match/:projectId');
  const t1 = await request({ ...BASE, method: 'GET', path: `/api/ai/match/${projectId}`, headers: { Cookie: cookie } });
  assert('Status 200', t1.status === 200, `got ${t1.status}`);
  assert('Has project object', !!t1.body.project?.id);
  assert('Has candidates array', Array.isArray(t1.body.candidates));
  assert('Has ai_enabled flag', typeof t1.body.ai_enabled === 'boolean');
  assert('Has total_candidates', typeof t1.body.total_candidates === 'number');
  console.log(`     → Found ${t1.body.total_candidates} candidates, AI enabled: ${t1.body.ai_enabled}`);
  if (t1.body.candidates.length > 0) {
    const c = t1.body.candidates[0];
    assert('Candidate has match_score', c.match_score !== undefined);
    assert('Candidate has matched_skills', Array.isArray(c.matched_skills));
    assert('match_score is 0-100', parseFloat(c.match_score) >= 0 && parseFloat(c.match_score) <= 100, `got ${c.match_score}`);
    console.log(`     → Top candidate: ${c.full_name}, score: ${c.match_score}%`);
  }

  // ── TEST 2: GET /api/ai/match/999999 (not found) ─────────────────────────
  console.log('\n[Step 5b] GET /api/ai/match/999999 (not found → 404)');
  const t2 = await request({ ...BASE, method: 'GET', path: '/api/ai/match/999999', headers: { Cookie: cookie } });
  assert('Status 404', t2.status === 404, `got ${t2.status}`);

  // ── TEST 3: GET /api/ai/match/abc (bad id → 400) ─────────────────────────
  console.log('\n[Step 5c] GET /api/ai/match/abc (bad id → 400)');
  const t3 = await request({ ...BASE, method: 'GET', path: '/api/ai/match/abc', headers: { Cookie: cookie } });
  assert('Status 400', t3.status === 400, `got ${t3.status}`);

  // ── TEST 4: POST /api/ai/roadmap ─────────────────────────────────────────
  console.log('\n[Step 8a] POST /api/ai/roadmap');
  const roadmapBody = JSON.stringify({
    title: 'Smart Campus Navigation App',
    description: 'A mobile app using ML to help students navigate campus.',
    skills: ['React Native', 'Python', 'Machine Learning'],
    teamSize: 4,
    duration: '4 months',
  });
  const t4 = await request({ ...BASE, method: 'POST', path: '/api/ai/roadmap', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(roadmapBody), Cookie: cookie } }, roadmapBody);
  assert('Status 200', t4.status === 200, `got ${t4.status}`);
  assert('Has ai_available flag', typeof t4.body.ai_available === 'boolean');
  assert('Has roadmap object', !!t4.body.roadmap || !!t4.body.roadmap_text);
  if (t4.body.roadmap?.phases) {
    assert('Roadmap has phases', Array.isArray(t4.body.roadmap.phases));
    assert('Has tech_stack', !!t4.body.roadmap.tech_stack);
  }

  // ── TEST 5: POST /api/ai/roadmap — missing title → 400 ───────────────────
  console.log('\n[Step 8b] POST /api/ai/roadmap (missing title → 400)');
  const badRoadmap = JSON.stringify({ description: 'No title' });
  const t5 = await request({ ...BASE, method: 'POST', path: '/api/ai/roadmap', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(badRoadmap), Cookie: cookie } }, badRoadmap);
  assert('Status 400', t5.status === 400, `got ${t5.status}`);

  // ── TEST 6: POST /api/ai/debug ────────────────────────────────────────────
  console.log('\n[Step 8c] POST /api/ai/debug');
  const debugBody = JSON.stringify({
    problem: 'My PostgreSQL query returns duplicate rows when joining two tables',
    code: 'SELECT u.*, p.* FROM users u JOIN posts p ON p.user_id = u.id',
    language: 'SQL',
  });
  const t6 = await request({ ...BASE, method: 'POST', path: '/api/ai/debug', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(debugBody), Cookie: cookie } }, debugBody);
  assert('Status 200', t6.status === 200, `got ${t6.status}`);
  assert('Has ai_available flag', typeof t6.body.ai_available === 'boolean');
  assert('Has response text', typeof t6.body.response === 'string' && t6.body.response.length > 0);

  // ── TEST 7: POST /api/ai/debug — missing problem → 400 ───────────────────
  console.log('\n[Step 8d] POST /api/ai/debug (missing problem → 400)');
  const badDebug = JSON.stringify({ code: 'some code' });
  const t7 = await request({ ...BASE, method: 'POST', path: '/api/ai/debug', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(badDebug), Cookie: cookie } }, badDebug);
  assert('Status 400', t7.status === 400, `got ${t7.status}`);

  // ── TEST 8: Unauthenticated → 401 ────────────────────────────────────────
  console.log('\n[Step 5/8e] AI endpoint without auth → 401');
  const t8 = await request({ ...BASE, method: 'GET', path: `/api/ai/match/${projectId}`, headers: {} });
  assert('Status 401', t8.status === 401, `got ${t8.status}`);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('🎉  All tests passed — Steps 5 & 8 verified!');
  else console.log('⚠️   Some tests failed.');
}

runTests().catch(err => { console.error('Test error:', err.message); process.exit(1); });
