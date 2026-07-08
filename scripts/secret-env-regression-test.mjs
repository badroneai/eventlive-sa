import fs from 'node:fs';

const reportPath = 'reports/secret-env-audit.json';
if (!fs.existsSync(reportPath)) {
  console.error('SECRET_ENV_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.schema !== 'eventlive.secret-env-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (!report.summary || report.summary.files_scanned < 20) failures.push('too few files scanned');
if (report.summary.findings !== 0) failures.push('secret findings present');
if (report.summary.environment_matrix_script !== 'present') failures.push('environment matrix missing');
if (!report.git_history_policy || report.git_history_policy.status !== 'DOCUMENTED') failures.push('git history policy missing');

if (failures.length) {
  console.error(`SECRET_ENV_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`SECRET_ENV_TEST_OK files=${report.summary.files_scanned}`);
