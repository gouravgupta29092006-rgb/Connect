// test-step6.js — Tests Step 6: Application flow + Notifications

const http = require('http');
const { BASE, TEST_USER, TEST_APPLICANT } = require('./test-config');

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

  // ── Setup: Register second user, log both in ─────────────────────────────
  const reg2Body = JSON.stringify(TEST_APPLICANT);
  await request({ ...BASE, method: 'POST', path: '/api/auth/register', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reg2Body) } }, reg2Body);

  const loginOwner = JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password });
  const ownerResp = await request({ ...BASE, method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginOwner) } }, loginOwner);
  const ownerCookie = extractCookie(ownerResp.headers);

  const loginApp = JSON.stringify({ email: TEST_APPLICANT.email, password: TEST_APPLICANT.password });
  const appResp = await request({ ...BASE, method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginApp) } }, loginApp);
  const applicantCookie = extractCookie(appResp.headers);

  if (!ownerCookie || !applicantCookie) { console.error('Login failed'); process.exit(1); }

  // Create a project as owner for testing
  const createBody = JSON.stringify({ title: 'Step6 Test Project', description: 'For application testing', status: 'recruiting', skills: [] });
  const createResp = await request({ ...BASE, method: 'POST', path: '/api/projects', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(createBody), Cookie: ownerCookie } }, createBody);
  const projectId = createResp.body.project?.id;
  console.log(`🔧  Created project id=${projectId} for testing\n`);

  // ── TEST 1: POST /api/projects/:id/apply (as applicant) ──────────────────
  console.log('[Step 6a] POST /api/projects/:id/apply');
  const applyBody = JSON.stringify({ message: 'I would love to join this project!' });
  const t1 = await request({ ...BASE, method: 'POST', path: `/api/projects/${projectId}/apply`, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(applyBody), Cookie: applicantCookie } }, applyBody);
  assert('Status 201', t1.status === 201, `got ${t1.status}`);
  assert('Has application.id', !!t1.body.application?.id);
  assert('Status is pending', t1.body.application?.status === 'pending');
  const applicationId = t1.body.application?.id;

  // ── TEST 2: Duplicate apply → 409 ────────────────────────────────────────
  console.log('\n[Step 6b] POST /api/projects/:id/apply (duplicate → 409)');
  const t2 = await request({ ...BASE, method: 'POST', path: `/api/projects/${projectId}/apply`, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(applyBody), Cookie: applicantCookie } }, applyBody);
  assert('Status 409', t2.status === 409, `got ${t2.status}`);

  // ── TEST 3: Owner applies to own project → 400 ──────────────────────────
  console.log('\n[Step 6c] Owner applies to own project → 400');
  const t3 = await request({ ...BASE, method: 'POST', path: `/api/projects/${projectId}/apply`, headers: { 'Content-Type': 'application/json', 'Content-Length': '2', Cookie: ownerCookie } }, '{}');
  assert('Status 400', t3.status === 400, `got ${t3.status}`);

  // ── TEST 4: GET /api/projects/:id/applications (as owner) ────────────────
  console.log('\n[Step 6d] GET /api/projects/:id/applications (owner)');
  const t4 = await request({ ...BASE, method: 'GET', path: `/api/projects/${projectId}/applications`, headers: { Cookie: ownerCookie } });
  assert('Status 200', t4.status === 200, `got ${t4.status}`);
  assert('Has applications array', Array.isArray(t4.body.applications));
  assert('At least 1 application', t4.body.applications.length >= 1);
  assert('Has applicant_skills', Array.isArray(t4.body.applications[0]?.applicant_skills));

  // ── TEST 5: GET /api/projects/:id/applications (as non-owner → 403) ──────
  console.log('\n[Step 6e] GET /api/projects/:id/applications (non-owner → 403)');
  const t5 = await request({ ...BASE, method: 'GET', path: `/api/projects/${projectId}/applications`, headers: { Cookie: applicantCookie } });
  assert('Status 403', t5.status === 403, `got ${t5.status}`);

  // ── TEST 6: GET /api/applications/mine (as applicant) ────────────────────
  console.log('\n[Step 6f] GET /api/applications/mine');
  const t6 = await request({ ...BASE, method: 'GET', path: '/api/applications/mine', headers: { Cookie: applicantCookie } });
  assert('Status 200', t6.status === 200, `got ${t6.status}`);
  assert('Has applications', t6.body.applications.length >= 1);
  assert('Has project title', !!t6.body.applications[0]?.title);

  // ── TEST 7: Owner gets notification about application ────────────────────
  console.log('\n[Step 6g] GET /api/notifications (owner should have notification)');
  const t7 = await request({ ...BASE, method: 'GET', path: '/api/notifications', headers: { Cookie: ownerCookie } });
  assert('Status 200', t7.status === 200, `got ${t7.status}`);
  assert('Has notifications', t7.body.notifications.length >= 1);
  assert('Has unread_count', typeof t7.body.unread_count === 'number');
  const notifId = t7.body.notifications[0]?.id;

  // ── TEST 8: Mark notification as read ────────────────────────────────────
  console.log('\n[Step 6h] PATCH /api/notifications/:id/read');
  const t8 = await request({ ...BASE, method: 'PATCH', path: `/api/notifications/${notifId}/read`, headers: { Cookie: ownerCookie } });
  assert('Status 200', t8.status === 200, `got ${t8.status}`);

  // ── TEST 9: PATCH /api/applications/:id — accept ────────────────────────
  console.log('\n[Step 6i] PATCH /api/applications/:id (accept)');
  const acceptBody = JSON.stringify({ status: 'accepted' });
  const t9 = await request({ ...BASE, method: 'PATCH', path: `/api/applications/${applicationId}`, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(acceptBody), Cookie: ownerCookie } }, acceptBody);
  assert('Status 200', t9.status === 200, `got ${t9.status}`);
  assert('Status is accepted', t9.body.application?.status === 'accepted');

  // ── TEST 10: Already decided → 400 ──────────────────────────────────────
  console.log('\n[Step 6j] PATCH /api/applications/:id (already decided → 400)');
  const t10 = await request({ ...BASE, method: 'PATCH', path: `/api/applications/${applicationId}`, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(acceptBody), Cookie: ownerCookie } }, acceptBody);
  assert('Status 400', t10.status === 400, `got ${t10.status}`);

  // ── TEST 11: Applicant got acceptance notification ───────────────────────
  console.log('\n[Step 6k] Applicant received acceptance notification');
  const t11 = await request({ ...BASE, method: 'GET', path: '/api/notifications', headers: { Cookie: applicantCookie } });
  assert('Status 200', t11.status === 200, `got ${t11.status}`);
  assert('Has notification', t11.body.notifications.length >= 1);
  const hasAccepted = t11.body.notifications.some(n => n.content.includes('accepted'));
  assert('Notification mentions accepted', hasAccepted);

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('🎉  All tests passed — Step 6 verified!');
  else console.log('⚠️   Some tests failed.');
}

runTests().catch(err => { console.error('Test error:', err.message); process.exit(1); });
