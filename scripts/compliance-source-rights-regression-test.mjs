import fs from 'node:fs';

const reportPath = 'reports/compliance-source-rights-audit.json';
if (!fs.existsSync(reportPath)) {
  console.error('COMPLIANCE_SOURCE_RIGHTS_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.schema !== 'eventlive.compliance-source-rights-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (!report.summary || report.summary.pages_checked !== 3) failures.push('expected 3 policy pages');
if (report.summary.findings !== 0) failures.push('findings present');

for (const file of ['privacy.html', 'terms.html', 'source-rights.html']) {
  const row = (report.pages || []).find((page) => page.file === file);
  if (!row || row.status !== 'PASS') failures.push(`page not passing ${file}`);
}

if (failures.length) {
  console.error(`COMPLIANCE_SOURCE_RIGHTS_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log('COMPLIANCE_SOURCE_RIGHTS_TEST_OK pages=3');
