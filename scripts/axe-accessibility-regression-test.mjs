import fs from 'node:fs';

const reportPath = 'reports/axe-accessibility-audit.json';
if (!fs.existsSync(reportPath)) {
  console.error('AXE_ACCESSIBILITY_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.schema !== 'eventlive.axe-accessibility-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (report.summary?.pages < 6) failures.push('too few pages');
if (report.summary?.score < 95) failures.push(`score below threshold ${report.summary?.score}`);
if (report.summary?.violations !== 0) failures.push('axe violations present');

if (failures.length) {
  console.error(`AXE_ACCESSIBILITY_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`AXE_ACCESSIBILITY_TEST_OK score=${report.summary.score}`);
