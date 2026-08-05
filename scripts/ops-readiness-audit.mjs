import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const generatedAt = new Date().toISOString();

const criticalPaths = [
  '/index.html',
  '/events.html',
  '/today-events.html',
  '/screen.html',
  '/live-status.json',
  '/events.ics',
  '/readiness.html'
];

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.ics')) return 'text/calendar; charset=utf-8';
  if (filePath.endsWith('.xml')) return 'application/xml; charset=utf-8';
  return 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const normalized = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
    const fullPath = path.join(distDir, normalized);
    if (!fullPath.startsWith(distDir) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentType(fullPath) });
    fs.createReadStream(fullPath).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` }));
  });
}

function readJson(relativePath, fallback = null) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return fallback;
  }
}

// "Fresh" means the file was written during THIS process's lifetime, i.e. by a
// step of the same run. mtime rather than the report's own generated_at field,
// because a report that a workflow merely checked out from git carries an old
// generated_at but could also carry a lying one; the filesystem cannot be
// talked into a story about when it was last written here.
const auditStartedAt = Date.now();
function isFreshlyGenerated(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return false;
  try {
    return fs.statSync(fullPath).mtimeMs >= auditStartedAt;
  } catch {
    return false;
  }
}

async function timedFetch(url) {
  const started = Date.now();
  const response = await fetch(url);
  await response.arrayBuffer();
  return {
    status: response.status,
    ok: response.ok,
    latency_ms: Date.now() - started
  };
}

const findings = [];
// Inputs this run could not honestly grade (see the Harvest OS note below).
// Recorded in the report and printed, never silently dropped, but they do not
// decide the verdict — that is the difference between 'not evaluated here'
// and 'evaluated and bad'.
const notEvaluated = [];
const { server, baseUrl } = await startServer();
const loadResults = [];

try {
  for (let round = 1; round <= 5; round += 1) {
    const roundResults = await Promise.all(criticalPaths.map(async (pagePath) => {
      try {
        return { path: pagePath, round, ...(await timedFetch(`${baseUrl}${pagePath}`)) };
      } catch (error) {
        return { path: pagePath, round, ok: false, status: 0, latency_ms: 0, error: error.message };
      }
    }));
    loadResults.push(...roundResults);
  }
} finally {
  server.close();
}

for (const row of loadResults) {
  if (!row.ok) findings.push({ area: 'load', issue: `${row.path} round ${row.round} returned ${row.status || row.error}` });
  if (row.latency_ms > 1200) findings.push({ area: 'load', issue: `${row.path} round ${row.round} latency ${row.latency_ms}ms` });
}

const docs = [
  'docs/RELIABILITY_FAILURE_MODES.md',
  'docs/OBSERVABILITY_MONITORING_PLAN.md',
  'docs/INCIDENT_RUNBOOK.md'
];
for (const doc of docs) {
  if (!fs.existsSync(path.join(root, doc))) findings.push({ area: 'docs', issue: `missing ${doc}` });
}

const analytics = readJson('reports/analytics-status.json', {});
const commandCenter = readJson('reports/eventlive-command-center.json', {});
const browserMatrix = readJson('reports/browser-matrix-audit.json', {});
const sourceOps = readJson('reports/source-harvest-os-status.json', {});

if (analytics.status !== 'PASS') findings.push({ area: 'observability', issue: 'analytics status is not PASS' });
if (commandCenter.schema !== 'eventlive.command-center.v1' || !Array.isArray(commandCenter.gates) || commandCenter.gates.length < 5) {
  findings.push({ area: 'observability', issue: 'owner command center report is missing or incomplete' });
}
if (browserMatrix.status !== 'PASS') findings.push({ area: 'reliability', issue: 'browser matrix is not PASS' });

// The Harvest OS status is produced by `owner:command-center`, which runs
// LATER than this audit in the shared publish battery and, in the sync
// workflow, reflects that run's live collector attempts. So whenever this
// audit reads it, it is reading a report from a PREVIOUS run — and in
// pr-verify, from a different workflow entirely. GATES-GOVERNANCE.md's own
// rule (written 2026-08-02) says a report-reading gate is meaningful only in
// the same job as the audit that regenerates the report; this input violated
// it, and on 2026-08-05 that cost us every PR: four government sources timed
// out during one sync (moc-cultural-calendar, mos-events, moc-cultural-subportals
// and one more), the Harvest OS verdict — which demands ZERO collector errors —
// flipped to NEEDS_WORK, was committed, and from then on every pull request
// failed pre-merge verification over a transient outage on someone else's
// website that no PR could possibly fix.
//
// So it is recorded, never suppressed, but it only FAILS this audit when the
// report was actually regenerated during this run. Same doctrine as the
// advisory-gate fix: separate "could not be evaluated here" from "evaluated
// and bad", and fail on the second only.
const sourceOpsFresh = isFreshlyGenerated('reports/source-harvest-os-status.json');
if (sourceOps.status !== 'PASS') {
  if (sourceOpsFresh) {
    findings.push({ area: 'reliability', issue: `source harvest OS status is not PASS (${sourceOps.status})` });
  } else {
    notEvaluated.push({
      area: 'reliability',
      issue: `source harvest OS status is ${sourceOps.status || 'missing'}, carried over from an earlier run — not evaluated here`,
      report: 'reports/source-harvest-os-status.json',
      generated_at: sourceOps.generated_at || null
    });
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['ops:alerts', 'ops:state', 'reliability:rollup', 'uptime:check', 'sources:state', 'sources:ops']) {
  if (!packageJson.scripts?.[script]) findings.push({ area: 'scripts', issue: `missing script ${script}` });
}

const status = findings.length === 0 ? 'PASS' : 'FAIL';
const maxLatency = Math.max(...loadResults.map((row) => row.latency_ms));
const avgLatency = Math.round(loadResults.reduce((sum, row) => sum + row.latency_ms, 0) / Math.max(loadResults.length, 1));
const report = {
  schema: 'eventlive.ops-readiness-audit.v1',
  generated_at: generatedAt,
  status,
  summary: {
    critical_paths: criticalPaths.length,
    load_checks: loadResults.length,
    max_latency_ms: maxLatency,
    avg_latency_ms: avgLatency,
    findings: findings.length,
    not_evaluated: notEvaluated.length,
    reliability_status: findings.some((item) => item.area === 'load' || item.area === 'reliability' || item.area === 'scripts') ? 'PARTIAL' : 'PASS',
    observability_status: findings.some((item) => item.area === 'observability' || item.area === 'docs') ? 'PARTIAL' : 'PASS'
  },
  load_results: loadResults,
  findings,
  not_evaluated: notEvaluated
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, 'ops-readiness-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(reportsDir, 'ops-readiness-audit.md'),
  [
    '# EventLive Operations Readiness Audit',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Load checks: ${report.summary.load_checks}`,
    `- Max latency: ${report.summary.max_latency_ms}ms`,
    `- Reliability: ${report.summary.reliability_status}`,
    `- Observability: ${report.summary.observability_status}`,
    `- Findings: ${findings.length}`,
    '',
    '## Findings',
    '',
    findings.length ? findings.map((item) => `- ${item.area}: ${item.issue}`).join('\n') : '- None',
    ''
  ].join('\n'),
  'utf8'
);

for (const item of notEvaluated) {
  console.log(`OPS_READINESS_NOT_EVALUATED ${item.area}: ${item.issue}`);
}

if (status !== 'PASS') {
  console.error(`OPS_READINESS_FAIL findings=${findings.length} not_evaluated=${notEvaluated.length}`);
  process.exit(1);
}

console.log(`OPS_READINESS_OK checks=${loadResults.length} max_latency=${maxLatency}ms not_evaluated=${notEvaluated.length}`);
