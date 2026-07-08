import fs from 'node:fs';

const reportPath = 'reports/browser-matrix-audit.json';
if (!fs.existsSync(reportPath)) {
  console.error('BROWSER_MATRIX_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.schema !== 'eventlive.browser-matrix-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (!report.summary || report.summary.engines < 2) failures.push('expected at least 2 engines');
if (report.summary.viewports < 3) failures.push('expected at least 3 viewports');
if (report.summary.pages < 6) failures.push('expected at least 6 pages');
if (report.summary.checks < 36) failures.push('expected 36 matrix checks');
if (report.summary.findings !== 0) failures.push('findings present');

if (failures.length) {
  console.error(`BROWSER_MATRIX_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`BROWSER_MATRIX_TEST_OK checks=${report.summary.checks}`);
