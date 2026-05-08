// test-step4.js — run with: node test-step4.js
// Tests Step 4: Project CRUD

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
  let cookie, projectId, skillId;

  function assert(label, condition, detail = '') {
    if (condition) { console.log(`  ✅ PASS: ${label}`); passed++; }
    else { console.log(`  ❌ FAIL: ${label} ${detail}`); failed++; }
  }

  // Login
  const loginBody = JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password });
  const lr = await request({ ...BASE, method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) } }, loginBody);
  cookie = extractCookie(lr.headers);
  if (!cookie) { console.error('Login failed'); process.exit(1); }

  // Get skill ids
  const skillsResp = await request({ ...BASE, method: 'GET', path: '/api/skills', headers: { Cookie: cookie } });
  skillId = skillsResp.body.skills[0].id;
  const skillId2 = skillsResp.body.skills[2].id;
  console.log('🔑  Logged in, using skills:', skillId, skillId2, '\n');

  // ── TEST 1: POST /api/projects ────────────────────────────────────────────
  console.log('[Step 4a] POST /api/projects (create)');
  const createBody = JSON.stringify({
    title: 'AI-Powered Playlist Generator',
    description: 'A machine learning app that generates music playlists based on user mood.',
    status: 'recruiting',
    skills: [{ skill_id: skillId, importance: 5 }, { skill_id: skillId2, importance: 3 }],
  });
  const t1 = await request({ ...BASE, method: 'POST', path: '/api/projects', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(createBody), Cookie: cookie } }, createBody);
  assert('Status 201', t1.status === 201, `got ${t1.status}`);
  assert('Has project.id', !!t1.body.project?.id);
  assert('Has project.skills array', Array.isArray(t1.body.project?.skills));
  assert('Skills count = 2', t1.body.project?.skills?.length === 2);
  assert('Has owner_name', !!t1.body.project?.owner_name);
  projectId = t1.body.project?.id;

  // ── TEST 2: POST missing title → 400 ─────────────────────────────────────
  console.log('\n[Step 4b] POST /api/projects (missing title → 400)');
  const bad1 = JSON.stringify({ description: 'No title project' });
  const t2 = await request({ ...BASE, method: 'POST', path: '/api/projects', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bad1), Cookie: cookie } }, bad1);
  assert('Status 400', t2.status === 400, `got ${t2.status}`);

  // ── TEST 3: GET /api/projects (list all) ─────────────────────────────────
  console.log('\n[Step 4c] GET /api/projects');
  const t3 = await request({ ...BASE, method: 'GET', path: '/api/projects', headers: { Cookie: cookie } });
  assert('Status 200', t3.status === 200, `got ${t3.status}`);
  assert('Returns projects array', Array.isArray(t3.body.projects));
  assert('At least 1 project', t3.body.projects.length >= 1);

  // ── TEST 4: GET /api/projects?status=recruiting ───────────────────────────
  console.log('\n[Step 4d] GET /api/projects?status=recruiting (filter)');
  const t4 = await request({ ...BASE, method: 'GET', path: '/api/projects?status=recruiting', headers: { Cookie: cookie } });
  assert('Status 200', t4.status === 200, `got ${t4.status}`);
  const allRecruiting = t4.body.projects.every(p => p.status === 'recruiting');
  assert('All results are recruiting', allRecruiting);

  // ── TEST 5: GET /api/projects?search=AI ──────────────────────────────────
  console.log('\n[Step 4e] GET /api/projects?search=AI (search)');
  const t5 = await request({ ...BASE, method: 'GET', path: '/api/projects?search=AI', headers: { Cookie: cookie } });
  assert('Status 200', t5.status === 200, `got ${t5.status}`);
  assert('Search returns result', t5.body.projects.length >= 1);

  // ── TEST 6: GET /api/projects/:id ────────────────────────────────────────
  console.log('\n[Step 4f] GET /api/projects/:id');
  const t6 = await request({ ...BASE, method: 'GET', path: `/api/projects/${projectId}`, headers: { Cookie: cookie } });
  assert('Status 200', t6.status === 200, `got ${t6.status}`);
  assert('Correct project id', t6.body.project?.id === projectId);
  assert('Skills populated', t6.body.project?.skills?.length === 2);

  // ── TEST 7: GET /api/projects/999 (not found) ────────────────────────────
  console.log('\n[Step 4g] GET /api/projects/999 (not found → 404)');
  const t7 = await request({ ...BASE, method: 'GET', path: '/api/projects/999999', headers: { Cookie: cookie } });
  assert('Status 404', t7.status === 404, `got ${t7.status}`);

  // ── TEST 8: PUT /api/projects/:id (owner update) ─────────────────────────
  console.log('\n[Step 4h] PUT /api/projects/:id (owner update)');
  const updateBody = JSON.stringify({ title: 'AI Playlist Generator v2', status: 'active' });
  const t8 = await request({ ...BASE, method: 'PUT', path: `/api/projects/${projectId}`, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updateBody), Cookie: cookie } }, updateBody);
  assert('Status 200', t8.status === 200, `got ${t8.status}`);
  assert('Title updated', t8.body.project?.title === 'AI Playlist Generator v2');
  assert('Status updated to active', t8.body.project?.status === 'active');

  // ── TEST 9: DELETE /api/projects/:id ─────────────────────────────────────
  console.log('\n[Step 4i] DELETE /api/projects/:id');
  const del1Body = JSON.stringify({ title: 'To Delete', description: 'This will be deleted', status: 'recruiting', skills: [] });
  const dCreate = await request({ ...BASE, method: 'POST', path: '/api/projects', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(del1Body), Cookie: cookie } }, del1Body);
  const delId = dCreate.body.project?.id;
  const t9 = await request({ ...BASE, method: 'DELETE', path: `/api/projects/${delId}`, headers: { Cookie: cookie } });
  assert('Status 200', t9.status === 200, `got ${t9.status}`);

  // ── TEST 10: Deleted project 404 ─────────────────────────────────────────
  console.log('\n[Step 4j] GET deleted project → 404');
  const t10 = await request({ ...BASE, method: 'GET', path: `/api/projects/${delId}`, headers: { Cookie: cookie } });
  assert('Status 404', t10.status === 404, `got ${t10.status}`);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('🎉  All tests passed — Step 4 verified!');
  else console.log('⚠️   Some tests failed.');
}

runTests().catch(err => { console.error('Test error:', err.message); process.exit(1); });
