import fs from 'node:fs';

const reportPath = 'reports/documentation-audit.json';
if (!fs.existsSync(reportPath)) {
  console.error('DOCUMENTATION_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.schema !== 'eventlive.documentation-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (!report.summary || report.summary.documents_checked < 6) failures.push('too few docs checked');
if (report.summary.findings !== 0) failures.push('findings present');

if (failures.length) {
  console.error(`DOCUMENTATION_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`DOCUMENTATION_TEST_OK docs=${report.summary.documents_checked}`);
