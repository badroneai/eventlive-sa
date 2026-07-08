import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const generatedAt = new Date().toISOString();
const reportsDir = path.join(root, 'reports');

function readText(relativePath, fallback = '') {
  const fullPath = path.join(root, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : fallback;
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

function command(commandName, args = []) {
  try {
    return execFileSync(commandName, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

const commit = env('RELEASE_DEPLOY_SHA', command('git', ['rev-parse', 'HEAD']));
const branch = env('RELEASE_DEPLOY_BRANCH', command('git', ['rev-parse', '--abbrev-ref', 'HEAD']));
const remote = command('git', ['config', '--get', 'remote.origin.url']);
const workflowStatus = env('RELEASE_WORKFLOW_STATUS').toLowerCase();
const workflowUrl = env('RELEASE_WORKFLOW_URL');
const publicUrl = env('RELEASE_PUBLIC_URL', 'https://eventme.live/');
const publicVerifyStatus = env('RELEASE_PUBLIC_VERIFY_STATUS').toLowerCase();
const rollbackDrillStatus = env('RELEASE_ROLLBACK_DRILL_STATUS').toLowerCase();
const rollbackDrillReference = env('RELEASE_ROLLBACK_DRILL_REFERENCE', 'ROLLBACK-RUNBOOK.md');

const deployWorkflow = readText('.github/workflows/deploy.yml');
const rollbackRunbook = readText('ROLLBACK-RUNBOOK.md') + '\n' + readText('docs/INCIDENT_RUNBOOK.md');
const launchPreflight = readJson('reports/launch-preflight-status.json', {});
const readinessStandard = readJson('reports/delivery-readiness-standard-status.json', {});

const checks = [
  {
    id: 'git_commit',
    label: 'Current git commit is known',
    ok: /^[0-9a-f]{40}$/i.test(commit),
    evidence: commit || 'missing'
  },
  {
    id: 'deploy_workflow',
    label: 'GitHub Pages deployment workflow exists',
    ok: /actions\/deploy-pages@v\d+/i.test(deployWorkflow) && /branches:\s*\[\s*main\s*\]/i.test(deployWorkflow),
    evidence: '.github/workflows/deploy.yml'
  },
  {
    id: 'launch_preflight',
    label: 'Launch preflight is passing before release',
    ok: launchPreflight.status === 'PASS',
    evidence: `reports/launch-preflight-status.json status=${launchPreflight.status || 'missing'}`
  },
  {
    id: 'readiness_gate_scope',
    label: 'Delivery standard exists with only release/owner-reserved completion remaining',
    ok:
      Array.isArray(readinessStandard.gates) &&
      readinessStandard.gates.filter((gate) => ['PARTIAL', 'NOT_STARTED', 'FAIL'].includes(gate.status)).every((gate) => gate.id === '21'),
    evidence: `reports/delivery-readiness-standard-status.json verdict=${readinessStandard.release_verdict || 'missing'}`
  },
  {
    id: 'workflow_success',
    label: 'Deployment workflow succeeded after push',
    ok: ['success', 'pass', 'passed'].includes(workflowStatus),
    evidence: workflowUrl || workflowStatus || 'pending external GitHub Actions evidence'
  },
  {
    id: 'public_verify',
    label: 'Public production URL was verified after deploy',
    ok: ['success', 'pass', 'passed'].includes(publicVerifyStatus),
    evidence: publicUrl
  },
  {
    id: 'rollback_drill',
    label: 'Rollback drill/runbook is documented for this release',
    ok:
      ['success', 'pass', 'passed', 'documented'].includes(rollbackDrillStatus) &&
      /git revert/i.test(rollbackRunbook) &&
      /launch:preflight|validate:gate/i.test(rollbackRunbook),
    evidence: rollbackDrillReference
  }
];

const failedChecks = checks.filter((check) => !check.ok);
const status = failedChecks.length === 0 ? 'PASS' : 'PARTIAL';

const report = {
  schema: 'eventlive.release-deploy-rollback.v1',
  generated_at: generatedAt,
  status,
  release: {
    commit,
    branch,
    remote,
    workflow_status: workflowStatus || 'pending',
    workflow_url: workflowUrl || null,
    public_url: publicUrl,
    public_verify_status: publicVerifyStatus || 'pending',
    rollback_drill_status: rollbackDrillStatus || 'pending',
    rollback_drill_reference: rollbackDrillReference
  },
  checks,
  remaining: failedChecks.map((check) => check.label)
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(
  path.join(reportsDir, 'release-deploy-rollback-status.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8'
);

const rows = checks
  .map((check) => `| ${check.id} | ${check.ok ? 'PASS' : 'PARTIAL'} | ${check.evidence.replace(/\|/g, '/')} |`)
  .join('\n');

fs.writeFileSync(
  path.join(reportsDir, 'release-deploy-rollback-status.md'),
  [
    '# EventLive Release, Deploy, Rollback Status',
    '',
    `- Generated at: ${generatedAt}`,
    `- Status: ${status}`,
    `- Commit: ${commit || 'missing'}`,
    `- Branch: ${branch || 'missing'}`,
    `- Public URL: ${publicUrl}`,
    '',
    '## Checks',
    '',
    '| Check | Status | Evidence |',
    '| --- | --- | --- |',
    rows,
    '',
    '## Remaining',
    '',
    failedChecks.length ? failedChecks.map((check) => `- ${check.label}`).join('\n') : '- None',
    ''
  ].join('\n'),
  'utf8'
);

console.log(`RELEASE_DEPLOY_ROLLBACK_AUDIT ${status} checks=${checks.length} remaining=${failedChecks.length}`);
