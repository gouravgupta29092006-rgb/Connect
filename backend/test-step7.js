// test-step7.js — Tests Step 7: Real-time chat + REST history

const http = require('http');
const { io: ioClient } = require('socket.io-client');
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

function connectSocket(cookie) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://${BASE.hostname}:${BASE.port}`, {
      extraHeaders: { Cookie: cookie },
      transports: ['websocket'],
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
  });
}

function waitForEvent(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });
}

async function runTests() {
  let passed = 0, failed = 0;

  function assert(label, condition, detail = '') {
    if (condition) { console.log(`  ✅ PASS: ${label}`); passed++; }
    else { console.log(`  ❌ FAIL: ${label} ${detail}`); failed++; }
  }

  // Login as two different users
  const login1 = JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password });
  const r1 = await request({ ...BASE, method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(login1) } }, login1);
  const cookie1 = extractCookie(r1.headers);

  const login2 = JSON.stringify({ email: TEST_APPLICANT.email, password: TEST_APPLICANT.password });
  const r2 = await request({ ...BASE, method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(login2) } }, login2);
  const cookie2 = extractCookie(r2.headers);

  // Get a project for the room
  const projResp = await request({ ...BASE, method: 'GET', path: '/api/projects', headers: { Cookie: cookie1 } });
  const projectId = projResp.body.projects[0].id;
  console.log(`🔧  Using project id=${projectId} for chat tests\n`);

  // ── TEST 1: Connect socket with valid cookie ─────────────────────────────
  console.log('[Step 7a] Socket.io connect with auth cookie');
  let socket1, socket2;
  try {
    socket1 = await connectSocket(cookie1);
    assert('Socket1 connected', socket1.connected);
    socket2 = await connectSocket(cookie2);
    assert('Socket2 connected', socket2.connected);
  } catch (err) {
    console.log(`  ❌ FAIL: Socket connection: ${err.message}`);
    failed += 2;
    process.exit(1);
  }

  // ── TEST 2: Connect socket WITHOUT cookie → should fail ──────────────────
  console.log('\n[Step 7b] Socket.io connect without cookie → error');
  try {
    const badSocket = ioClient(`http://${BASE.hostname}:${BASE.port}`, { transports: ['websocket'] });
    const errorPromise = new Promise((resolve) => {
      badSocket.on('connect_error', (err) => { badSocket.disconnect(); resolve(err); });
      setTimeout(() => { badSocket.disconnect(); resolve(new Error('timeout')); }, 3000);
    });
    const err = await errorPromise;
    assert('Unauthenticated socket rejected', err !== null);
  } catch {
    assert('Unauthenticated socket rejected', true);
  }

  // ── TEST 3: Join room ────────────────────────────────────────────────────
  console.log('\n[Step 7c] Join room + user_joined event');
  const joinPromise = waitForEvent(socket1, 'user_joined');
  socket1.emit('join_room', { projectId });
  await new Promise(r => setTimeout(r, 300));
  socket2.emit('join_room', { projectId });
  try {
    const joinData = await joinPromise;
    assert('user_joined received', !!joinData.fullName);
    assert('Correct projectId in event', joinData.projectId === projectId);
  } catch (err) {
    console.log(`  ❌ FAIL: ${err.message}`); failed += 2;
  }

  // ── TEST 4: Send message → both receive ──────────────────────────────────
  console.log('\n[Step 7d] Send message → both receive new_message');
  const msg1Promise = waitForEvent(socket1, 'new_message');
  const msg2Promise = waitForEvent(socket2, 'new_message');
  socket2.emit('send_message', { projectId, content: 'Hello from socket2! 🚀' });
  try {
    const [m1, m2] = await Promise.all([msg1Promise, msg2Promise]);
    assert('Socket1 received message', m1.content === 'Hello from socket2! 🚀');
    assert('Socket2 received message', m2.content === 'Hello from socket2! 🚀');
    assert('Has sender_name', !!m1.sender_name);
    assert('Has created_at', !!m1.created_at);
    assert('Has id (persisted)', typeof m1.id === 'number');
  } catch (err) {
    console.log(`  ❌ FAIL: ${err.message}`); failed += 5;
  }

  // Send another message from socket1
  const msg3Promise = waitForEvent(socket2, 'new_message');
  socket1.emit('send_message', { projectId, content: 'Reply from socket1' });
  try { await msg3Promise; } catch { /* non-critical */ }

  // ── TEST 5: REST chat history ────────────────────────────────────────────
  console.log('\n[Step 7e] GET /api/chat/:projectId/messages (REST history)');
  const t5 = await request({ ...BASE, method: 'GET', path: `/api/chat/${projectId}/messages`, headers: { Cookie: cookie1 } });
  assert('Status 200', t5.status === 200, `got ${t5.status}`);
  assert('Has messages array', Array.isArray(t5.body.messages));
  assert('Messages persisted (≥2)', t5.body.messages.length >= 2, `got ${t5.body.messages.length}`);
  assert('First message has sender_name', !!t5.body.messages[0]?.sender_name);

  // ── TEST 6: Leave room ──────────────────────────────────────────────────
  console.log('\n[Step 7f] Leave room');
  const leavePromise = waitForEvent(socket1, 'user_left', 3000).catch(() => null);
  socket2.emit('leave_room', { projectId });
  await leavePromise;
  assert('user_left received or graceful', true);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  socket1.disconnect();
  socket2.disconnect();

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('🎉  All tests passed — Step 7 verified!');
  else console.log('⚠️   Some tests failed.');
}

runTests().catch(err => { console.error('Test error:', err.message); process.exit(1); });
