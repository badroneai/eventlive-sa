import fs from 'node:fs';

const reportPath = 'reports/ui-state-audit.json';
if (!fs.existsSync(reportPath)) {
  console.error('UI_STATE_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.schema !== 'eventlive.ui-state-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (!report.summary || report.summary.pages_checked < 4) failures.push('too few pages checked');
if (report.summary.states_checked < 8) failures.push('too few states checked');
if (report.summary.findings !== 0) failures.push('findings present');

if (failures.length) {
  console.error(`UI_STATE_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`UI_STATE_TEST_OK states=${report.summary.states_checked}`);
