import fs from 'node:fs';

const reportPath = 'reports/lighthouse-performance-audit.json';
if (!fs.existsSync(reportPath)) {
  console.error('LIGHTHOUSE_PERFORMANCE_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.schema !== 'eventlive.lighthouse-performance-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (report.summary?.pages < 4) failures.push('too few pages');
if (report.summary?.min_performance < 90) failures.push(`performance below threshold ${report.summary?.min_performance}`);
if (report.summary?.min_accessibility < 95) failures.push(`accessibility below threshold ${report.summary?.min_accessibility}`);

if (failures.length) {
  console.error(`LIGHTHOUSE_PERFORMANCE_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`LIGHTHOUSE_PERFORMANCE_TEST_OK min_perf=${report.summary.min_performance}`);
