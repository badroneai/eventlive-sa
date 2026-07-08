import fs from 'node:fs';

const reportPath = 'reports/security-review-audit.json';
if (!fs.existsSync(reportPath)) {
  console.error('SECURITY_REVIEW_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.schema !== 'eventlive.security-review-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (!report.summary || report.summary.public_html_files_scanned < 30) failures.push('too few public HTML files scanned');
if (report.summary.findings !== 0) failures.push('findings present');
if (report.summary.target_blank_issues !== 0) failures.push('target blank issues present');
if (report.summary.http_resource_issues !== 0) failures.push('http resource issues present');

for (const control of ['web_quality_security', 'secret_env_audit', 'static_analysis', 'compliance_source_rights']) {
  if (report.controls?.[control] !== 'PASS') failures.push(`control not passing ${control}`);
}

if ((report.controls?.ci_security_steps || []).length < 4) failures.push('missing ci security steps');

if (failures.length) {
  console.error(`SECURITY_REVIEW_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`SECURITY_REVIEW_TEST_OK html=${report.summary.public_html_files_scanned}`);
