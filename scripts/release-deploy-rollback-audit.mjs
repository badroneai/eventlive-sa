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
const workflowStatusRaw = env('RELEASE_WORKFLOW_STATUS');
const workflowStatus = workflowStatusRaw.toLowerCase();
const workflowUrl = env('RELEASE_WORKFLOW_URL');
const publicUrl = env('RELEASE_PUBLIC_URL', 'https://eventme.live/');
const publicVerifyStatusRaw = env('RELEASE_PUBLIC_VERIFY_STATUS');
const publicVerifyStatus = publicVerifyStatusRaw.toLowerCase();
const rollbackDrillReference = env('RELEASE_ROLLBACK_DRILL_REFERENCE', 'ROLLBACK-RUNBOOK.md');

// workflow_success and public_verify read RELEASE_WORKFLOW_STATUS /
// RELEASE_PUBLIC_VERIFY_STATUS, which nothing populates inside the `build`
// job (this script's most common caller, via ci:publish-quality-gates) —
// those facts (did the GitHub Actions run succeed, did the just-deployed
// public URL respond) do not exist yet mid-build. That is not a soft
// failure, it is a structurally inapplicable check: there is no true/false
// answer to compute yet. Only the post-deploy `verify-release` job (see
// .github/workflows/deploy.yml) can populate these, from
// `needs.deploy.result` and the post-deploy uptime check outcome, and it now
// does (GATES-GOVERNANCE.md #6). Applicability is judged purely on "was the
// input supplied at all", independent of whether the supplied value is good
// or bad — a supplied-but-bad value is a genuine FAIL, an unsupplied value
// is NOT_APPLICABLE here.
const workflowStatusApplicable = workflowStatusRaw !== '';
const publicVerifyStatusApplicable = publicVerifyStatusRaw !== '';

const deployWorkflow = readText('.github/workflows/deploy.yml');
const rollbackRunbook = readText('ROLLBACK-RUNBOOK.md') + '\n' + readText('docs/INCIDENT_RUNBOOK.md');
const launchPreflight = readJson('reports/launch-preflight-status.json', {});
const readinessStandard = readJson('reports/delivery-readiness-standard-status.json', {});

// Every check defaults to applicable: true (structural facts about this
// repo/checkout, evaluable in any job). Only workflow_success and
// public_verify can be inapplicable, and only when their input env var was
// never supplied.
const checks = [
  {
    id: 'git_commit',
    label: 'Current git commit is known',
    applicable: true,
    ok: /^[0-9a-f]{40}$/i.test(commit),
    evidence: commit || 'missing'
  },
  {
    id: 'deploy_workflow',
    label: 'GitHub Pages deployment workflow exists',
    applicable: true,
    ok: /actions\/deploy-pages@v\d+/i.test(deployWorkflow) && /branches:\s*\[\s*main\s*\]/i.test(deployWorkflow),
    evidence: '.github/workflows/deploy.yml'
  },
  {
    id: 'launch_preflight',
    label: 'Launch preflight is passing before release',
    applicable: true,
    ok: launchPreflight.status === 'PASS',
    evidence: `reports/launch-preflight-status.json status=${launchPreflight.status || 'missing'}`
  },
  {
    id: 'readiness_gate_scope',
    label: 'Delivery standard exists with only release/owner-reserved completion remaining',
    applicable: true,
    ok:
      Array.isArray(readinessStandard.gates) &&
      readinessStandard.gates.filter((gate) => ['PARTIAL', 'NOT_STARTED', 'FAIL'].includes(gate.status)).every((gate) => gate.id === '21'),
    evidence: `reports/delivery-readiness-standard-status.json verdict=${readinessStandard.release_verdict || 'missing'}`
  },
  {
    id: 'workflow_success',
    label: 'Deployment workflow succeeded after push',
    applicable: workflowStatusApplicable,
    ok: workflowStatusApplicable && ['success', 'pass', 'passed'].includes(workflowStatus),
    evidence: workflowStatusApplicable
      ? (workflowUrl || workflowStatus)
      : 'not evaluated here — RELEASE_WORKFLOW_STATUS is only populated post-deploy (verify-release job); see GATES-GOVERNANCE.md #6'
  },
  {
    id: 'public_verify',
    label: 'Public production URL was verified after deploy',
    applicable: publicVerifyStatusApplicable,
    ok: publicVerifyStatusApplicable && ['success', 'pass', 'passed'].includes(publicVerifyStatus),
    evidence: publicVerifyStatusApplicable
      ? publicUrl
      : 'not evaluated here — RELEASE_PUBLIC_VERIFY_STATUS is only populated post-deploy (verify-release job, post-deploy uptime check); see GATES-GOVERNANCE.md #6'
  },
  {
    id: 'rollback_drill',
    label: 'Rollback drill/runbook is documented for this release',
    // Purely a static-content check (no live "drill" is executed by this
    // pipeline today) — evaluable in any job, so it is always applicable,
    // unlike workflow_success/public_verify above.
    applicable: true,
    ok:
      /git revert/i.test(rollbackRunbook) &&
      /launch:preflight|validate:gate/i.test(rollbackRunbook),
    evidence: rollbackDrillReference
  }
];

const evaluatedChecks = checks.filter((check) => check.applicable);
const notApplicableChecks = checks.filter((check) => !check.applicable);
const failedEvaluatedChecks = evaluatedChecks.filter((check) => !check.ok);

// Distinction the report and exit code both honor (GATES-GOVERNANCE.md #6):
// FAIL = at least one check that COULD be evaluated here came back bad —
// a genuine defect, safe to block on. PARTIAL = every evaluated check is
// fine, but one or more checks could not be evaluated in this job (their
// input does not exist yet, e.g. mid-build) — that is a job-scope gap, not
// evidence of a bad release, and must never block. PASS = fully evaluated
// and clean.
const status = failedEvaluatedChecks.length > 0
  ? 'FAIL'
  : notApplicableChecks.length > 0
    ? 'PARTIAL'
    : 'PASS';

const report = {
  schema: 'eventlive.release-deploy-rollback.v1',
  generated_at: generatedAt,
  status,
  release: {
    commit,
    branch,
    remote,
    workflow_status: workflowStatusApplicable ? workflowStatus : 'not_evaluated_here',
    workflow_url: workflowUrl || null,
    public_url: publicUrl,
    public_verify_status: publicVerifyStatusApplicable ? publicVerifyStatus : 'not_evaluated_here',
    rollback_drill_reference: rollbackDrillReference
  },
  checks: checks.map((check) => ({
    id: check.id,
    label: check.label,
    applicable: check.applicable,
    ok: check.ok,
    status: !check.applicable ? 'NOT_APPLICABLE' : check.ok ? 'PASS' : 'FAIL',
    evidence: check.evidence
  })),
  failed: failedEvaluatedChecks.map((check) => check.label),
  not_applicable: notApplicableChecks.map((check) => check.label),
  // Kept for backward compatibility with any existing reader of `remaining`
  // (nothing genuinely evaluated-good is ever listed here).
  remaining: [...failedEvaluatedChecks, ...notApplicableChecks].map((check) => check.label)
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(
  path.join(reportsDir, 'release-deploy-rollback-status.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8'
);

const rows = report.checks
  .map((check) => `| ${check.id} | ${check.status} | ${check.evidence.replace(/\|/g, '/')} |`)
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
    '## Failed (evaluated and genuinely bad — blocks this script)',
    '',
    failedEvaluatedChecks.length ? failedEvaluatedChecks.map((check) => `- ${check.label}`).join('\n') : '- None',
    '',
    '## Not Applicable (could not be evaluated in this job — never blocks)',
    '',
    notApplicableChecks.length ? notApplicableChecks.map((check) => `- ${check.label}`).join('\n') : '- None',
    ''
  ].join('\n'),
  'utf8'
);

console.log(
  `RELEASE_DEPLOY_ROLLBACK_AUDIT ${status} checks=${checks.length} evaluated=${evaluatedChecks.length} not_applicable=${notApplicableChecks.length} failed=${failedEvaluatedChecks.length}`
);

// Enforcing only on FAIL (see status derivation above) — PARTIAL must never
// block a publish, that would freeze the pipeline over a job-scope gap that
// nobody intends to fix (this project already survived one 8-day publishing
// outage). GATES-GOVERNANCE.md #6.
if (status === 'FAIL') {
  console.error(`RELEASE_DEPLOY_ROLLBACK_AUDIT_FAIL checks=${failedEvaluatedChecks.map((check) => check.id).join(', ')}`);
  process.exit(1);
}
