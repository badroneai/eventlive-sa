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

if (!['PASS', 'PARTIAL'].includes(report.status)) {
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
  if (!check.evidence || check.evidence.length < 4) fail(`check ${id} missing evidence`);
}

const failedChecks = checks.filter((check) => !check.ok);
if (report.status === 'PASS' && failedChecks.length > 0) {
  fail('PASS report cannot contain failed checks');
}

if (report.status === 'PARTIAL' && (!Array.isArray(report.remaining) || report.remaining.length === 0)) {
  fail('PARTIAL report must list remaining release work');
}

console.log(`RELEASE_DEPLOY_ROLLBACK_TEST_OK status=${report.status} checks=${checks.length}`);
