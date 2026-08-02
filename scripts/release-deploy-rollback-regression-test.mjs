import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportPath = path.join(root, 'reports/release-deploy-rollback-status.json');

function fail(message) {
  console.error(`RELEASE_DEPLOY_ROLLBACK_TEST_FAIL ${message}`);
  process.exit(1);
}

if (!fs.existsSync(reportPath)) {
  fail('missing reports/release-deploy-rollback-status.json; run npm run audit:release-deploy-rollback first');
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

if (report.schema !== 'eventlive.release-deploy-rollback.v1') {
  fail(`unexpected schema ${report.schema}`);
}

if (!['PASS', 'PARTIAL', 'FAIL'].includes(report.status)) {
  fail(`unexpected status ${report.status}`);
}

if (!report.release?.commit || !/^[0-9a-f]{40}$/i.test(report.release.commit)) {
  fail('release commit must be a full 40-char git SHA');
}

const checks = Array.isArray(report.checks) ? report.checks : [];
const required = [
  'git_commit',
  'deploy_workflow',
  'launch_preflight',
  'readiness_gate_scope',
  'workflow_success',
  'public_verify',
  'rollback_drill'
];

for (const id of required) {
  const check = checks.find((item) => item.id === id);
  if (!check) fail(`missing check ${id}`);
  if (typeof check.ok !== 'boolean') fail(`check ${id} missing boolean ok`);
  if (typeof check.applicable !== 'boolean') fail(`check ${id} missing boolean applicable`);
  if (!['PASS', 'FAIL', 'NOT_APPLICABLE'].includes(check.status)) fail(`check ${id} has invalid status ${check.status}`);
  if (check.applicable === (check.status === 'NOT_APPLICABLE')) fail(`check ${id} applicable/status disagree`);
  if (!check.evidence || check.evidence.length < 4) fail(`check ${id} missing evidence`);
}

// Shape-only test (GATES-GOVERNANCE.md #6): this verifies the report has the
// right structure and that the enforcing/not-applicable distinction is
// internally consistent. It deliberately does NOT re-derive or second-guess
// the substantive verdict — that is release-deploy-rollback-audit.mjs's own
// job now (it exits non-zero on FAIL itself), not this test's.
const evaluatedChecks = checks.filter((check) => check.applicable);
const failedEvaluatedChecks = evaluatedChecks.filter((check) => !check.ok);
const notApplicableChecks = checks.filter((check) => !check.applicable);

if (report.status === 'PASS' && (failedEvaluatedChecks.length > 0 || notApplicableChecks.length > 0)) {
  fail('PASS report cannot contain failed or not-applicable checks');
}

if (report.status === 'FAIL' && failedEvaluatedChecks.length === 0) {
  fail('FAIL report must list at least one evaluated-and-failed check');
}

if (report.status === 'PARTIAL' && (failedEvaluatedChecks.length > 0 || notApplicableChecks.length === 0)) {
  fail('PARTIAL report must have zero evaluated failures and at least one not-applicable check');
}

if (!Array.isArray(report.failed) || !Array.isArray(report.not_applicable)) {
  fail('report must separately list `failed` and `not_applicable` checks — a not-applicable check must never be indistinguishable from a genuinely failed one (GATES-GOVERNANCE.md #6)');
}

console.log(`RELEASE_DEPLOY_ROLLBACK_TEST_OK status=${report.status} checks=${checks.length} failed=${failedEvaluatedChecks.length} not_applicable=${notApplicableChecks.length}`);
