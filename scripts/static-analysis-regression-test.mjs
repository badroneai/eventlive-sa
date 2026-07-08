import fs from 'node:fs';

const reportPath = 'reports/static-analysis-audit.json';
if (!fs.existsSync(reportPath)) {
  console.error('STATIC_ANALYSIS_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.schema !== 'eventlive.static-analysis-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (!report.summary || report.summary.script_files_checked < 20) failures.push('too few script files checked');
if (report.summary.syntax_failures !== 0) failures.push('syntax failures present');
if (report.summary.missing_package_script_references !== 0) failures.push('missing package script references present');
if (report.summary.high_risk_findings !== 0) failures.push('high risk findings present');

if (failures.length) {
  console.error(`STATIC_ANALYSIS_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`STATIC_ANALYSIS_TEST_OK files=${report.summary.script_files_checked}`);
