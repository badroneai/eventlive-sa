import fs from 'node:fs';

const reportPath = 'reports/ops-readiness-audit.json';
if (!fs.existsSync(reportPath)) {
  console.error('OPS_READINESS_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.schema !== 'eventlive.ops-readiness-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (!report.summary || report.summary.load_checks < 35) failures.push('too few load checks');
if (report.summary.max_latency_ms > 1200) failures.push(`max latency too high ${report.summary.max_latency_ms}`);
if (report.summary.reliability_status !== 'PASS') failures.push('reliability not PASS');
if (report.summary.observability_status !== 'PASS') failures.push('observability not PASS');
if (report.summary.findings !== 0) failures.push('findings present');

if (failures.length) {
  console.error(`OPS_READINESS_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`OPS_READINESS_TEST_OK checks=${report.summary.load_checks}`);
