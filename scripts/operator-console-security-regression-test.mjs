import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const serverPath = path.join(repoRoot, 'apps', 'operator-console', 'server.mjs');
const consoleAppPath = path.join(repoRoot, 'apps', 'operator-console', 'public', 'app.js');
const token = 'operator-console-security-test-token';
const workspaceId = 'operator-security-test';
const mutationRoutes = [
  { method: 'POST', pathname: `/api/workspaces/${workspaceId}/publish`, body: { releaseNote: 'unauthorized publish' } },
  { method: 'POST', pathname: '/api/workspaces', body: { workspaceId: 'unauthorized-create', programTitle: 'Blocked', organizerName: 'Blocked' } },
  { method: 'PUT', pathname: `/api/workspaces/${workspaceId}/draft`, body: { draft: {} } },
  { method: 'POST', pathname: `/api/workspaces/${workspaceId}/validate`, body: {} },
  { method: 'POST', pathname: `/api/workspaces/${workspaceId}/preview`, body: {} },
  { method: 'POST', pathname: `/api/workspaces/${workspaceId}/normalize`, body: { csvText: '' } },
  { method: 'POST', pathname: `/api/workspaces/${workspaceId}/intake-review`, body: { csvText: '' } },
  { method: 'POST', pathname: `/api/workspaces/${workspaceId}/import-file`, body: { filename: '', contentBase64: '' } },
  { method: 'POST', pathname: `/api/workspaces/${workspaceId}/diff`, body: {} },
  { method: 'POST', pathname: `/api/workspaces/${workspaceId}/approve`, body: { approvalNote: '' } },
  { method: 'POST', pathname: `/api/workspaces/${workspaceId}/archive`, body: {} }
];

assert.ok(fs.existsSync(serverPath), `Missing operator console server: ${serverPath}`);
assert.ok(fs.existsSync(consoleAppPath), `Missing operator console client: ${consoleAppPath}`);
const consoleAppSource = fs.readFileSync(consoleAppPath, 'utf8');
assert.match(consoleAppSource, /sessionStorage\.setItem\(OPERATOR_TOKEN_SESSION_KEY/, 'Console client must keep its token in sessionStorage');
assert.match(consoleAppSource, /headers\.set\('authorization', `Bearer \$\{token\}`\)/, 'Console client must send bearer auth on state changes');
assert.doesNotMatch(consoleAppSource, /localStorage\.(?:getItem|setItem)\(OPERATOR_TOKEN_SESSION_KEY/, 'Console token must not persist in localStorage');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function buildFixture(tempRoot) {
  const workspaceRoot = path.join(tempRoot, 'workspaces', workspaceId);
  const draft = {
    program: {
      program_title: 'Operator Security Test',
      organizer_name: 'EventMe Test',
      venue: 'Test Venue',
      city: 'Riyadh',
      event_start: '2026-08-01T09:00:00+03:00',
      event_end: '2026-08-01T10:00:00+03:00',
      updated_at: '2026-07-18T12:00:00+03:00'
    },
    sessions: [
      {
        id: 'security-session',
        session_title: 'Security acceptance fixture'
      }
    ]
  };
  const manifestPath = path.join(workspaceRoot, 'workspace.json');
  const draftPath = path.join(workspaceRoot, 'draft', 'current-program.json');
  const approvedPath = path.join(workspaceRoot, 'approved', 'approved-program.json');

  writeJson(draftPath, draft);
  writeJson(approvedPath, draft);
  writeJson(manifestPath, {
    workspace_id: workspaceId,
    slug: workspaceId,
    status: 'validated_draft',
    program_title: draft.program.program_title,
    organizer_name: draft.program.organizer_name,
    draft_file: `workspaces/${workspaceId}/draft/current-program.json`,
    approved_draft_file: `workspaces/${workspaceId}/approved/approved-program.json`,
    approved_at: '2026-07-18T09:00:00.000Z',
    approval_note: 'Security regression fixture',
    last_validation_status: 'passed',
    last_validation_at: '2026-07-18T09:00:00.000Z',
    preview_ready: true,
    last_preview_at: '2026-07-18T09:00:00.000Z',
    current_release_id: null,
    archived_release_ids: [],
    created_at: '2026-07-18T09:00:00.000Z',
    updated_at: '2026-07-18T09:00:00.000Z'
  });

  const publishStubPath = path.join(tempRoot, 'scripts', 'publish-program.mjs');
  fs.mkdirSync(path.dirname(publishStubPath), { recursive: true });
  fs.writeFileSync(publishStubPath, "process.stdout.write('TEST_PUBLISH_OK\\n');\n", 'utf8');

  return { manifestPath };
}

async function getFreePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  assert.ok(address && typeof address === 'object', 'Could not reserve a test port');
  const freePort = address.port;
  await new Promise((resolve, reject) => probe.close((error) => (error ? reject(error) : resolve())));
  return freePort;
}

function spawnConsole(tempRoot, envOverrides) {
  const child = spawn(process.execPath, [serverPath], {
    cwd: tempRoot,
    env: {
      ...process.env,
      ...envOverrides
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const output = { stdout: '', stderr: '' };
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    output.stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output.stderr += chunk;
  });
  return { child, output };
}

async function waitForReady(processState) {
  const { child, output } = processState;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Operator console did not become ready\nstdout: ${output.stdout}\nstderr: ${output.stderr}`));
    }, 10_000);

    const inspect = () => {
      if (!output.stdout.includes('OPERATOR_CONSOLE_OK')) return;
      clearTimeout(timeout);
      child.off('exit', onExit);
      resolve();
    };
    const onExit = (code) => {
      clearTimeout(timeout);
      reject(new Error(`Operator console exited before readiness (code=${code})\nstdout: ${output.stdout}\nstderr: ${output.stderr}`));
    };

    child.stdout.on('data', inspect);
    child.once('exit', onExit);
    inspect();
  });
}

async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000))
  ]);
  if (!stopped && child.exitCode === null) {
    child.kill('SIGKILL');
    await exited;
  }
}

async function request(origin, route, security = {}) {
  const headers = { 'content-type': 'application/json' };
  if (security.token !== undefined) headers.authorization = `Bearer ${security.token}`;
  if (security.origin !== undefined) headers.origin = security.origin;
  if (security.referer !== undefined) headers.referer = security.referer;
  if (security.host !== undefined) headers.host = security.host;
  const response = await fetch(`${origin}${route.pathname}`, {
    method: route.method,
    headers,
    body: ['GET', 'HEAD'].includes(route.method) ? undefined : JSON.stringify(route.body ?? {}),
    signal: AbortSignal.timeout(10_000)
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  return { response, payload };
}

async function assertNonLoopbackRefusal(tempRoot) {
  const port = await getFreePort();
  const env = {
    OPERATOR_CONSOLE_HOST: '0.0.0.0',
    OPERATOR_CONSOLE_PORT: String(port),
    OPERATOR_CONSOLE_TOKEN: ''
  };
  const processState = spawnConsole(tempRoot, env);
  const { child, output } = processState;

  const result = await Promise.race([
    new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal }))),
    new Promise((resolve) => setTimeout(() => resolve(null), 4_000))
  ]);

  if (!result) {
    await stopProcess(child);
    assert.fail('Non-loopback operator console started without OPERATOR_CONSOLE_TOKEN');
  }
  assert.notEqual(result.code, 0, 'Non-loopback bind without token must exit nonzero');
  assert.doesNotMatch(output.stdout, /OPERATOR_CONSOLE_OK/, 'Refused bind must not start listening');
  assert.match(`${output.stdout}\n${output.stderr}`, /OPERATOR_CONSOLE_TOKEN/, 'Refusal must identify the missing token');
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eventme-operator-security-'));
let runningConsole = null;

try {
  const { manifestPath } = buildFixture(tempRoot);
  const port = await getFreePort();
  const origin = `http://127.0.0.1:${port}`;
  runningConsole = spawnConsole(tempRoot, {
    OPERATOR_CONSOLE_HOST: '127.0.0.1',
    OPERATOR_CONSOLE_PORT: String(port),
    OPERATOR_CONSOLE_TOKEN: token
  });
  await waitForReady(runningConsole);

  const manifestBeforeRejectedRequests = fs.readFileSync(manifestPath, 'utf8');
  for (const route of mutationRoutes) {
    const result = await request(origin, route, { origin });
    assert.equal(result.response.status, 401, `${route.method} ${route.pathname} without bearer token must return 401`);
    assert.match(result.response.headers.get('www-authenticate') || '', /^Bearer\b/i, '401 must advertise Bearer authentication');
  }
  assert.equal(
    fs.readFileSync(manifestPath, 'utf8'),
    manifestBeforeRejectedRequests,
    'Rejected mutation requests must not change the workspace manifest'
  );

  const publishRoute = mutationRoutes[0];
  assert.equal((await request(origin, publishRoute, { token: 'wrong-token', origin })).response.status, 401, 'Wrong bearer token must return 401');
  assert.equal((await request(origin, publishRoute, { token })).response.status, 403, 'Missing Origin/Referer must return 403');
  assert.equal((await request(origin, publishRoute, { token, origin: 'https://attacker.example' })).response.status, 403, 'Foreign Origin must return 403');
  assert.equal(
    (await request(origin, publishRoute, { token, origin: 'http://attacker.example', host: 'attacker.example' })).response.status,
    403,
    'A forged Host header must not redefine the console Origin'
  );
  assert.equal((await request(origin, publishRoute, { token, referer: 'https://attacker.example/path' })).response.status, 403, 'Foreign Referer must return 403');
  assert.equal(
    (await request(origin, publishRoute, { token, origin, referer: 'https://attacker.example/path' })).response.status,
    403,
    'Every supplied Origin/Referer header must match'
  );

  const authorizedPublish = await request(origin, publishRoute, { token, origin });
  assert.equal(authorizedPublish.response.status, 200, 'Correct bearer token and console Origin must allow publish');
  assert.equal(authorizedPublish.payload?.ok, true, 'Authorized publish must complete successfully');

  const authorizedCreate = await request(origin, mutationRoutes[1], { token, referer: `${origin}/` });
  assert.equal(authorizedCreate.response.status, 201, 'Matching Referer must work as the Origin fallback');

  const readResult = await request(origin, { method: 'GET', pathname: '/api/workspaces' });
  assert.equal(readResult.response.status, 200, 'Read-only API routes must remain available without bearer token');

  await stopProcess(runningConsole.child);
  runningConsole = null;
  await assertNonLoopbackRefusal(tempRoot);

  console.log(`TEST_OK operator console security mutations=${mutationRoutes.length} unauthorized_publish=401 authorized_publish=200 referer_fallback=201 csrf_rejections=5 nonloopback_refused=1`);
} finally {
  if (runningConsole) await stopProcess(runningConsole.child);
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
