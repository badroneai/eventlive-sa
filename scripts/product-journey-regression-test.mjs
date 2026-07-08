import fs from 'node:fs';

const reportPath = 'reports/product-journey-audit.json';
if (!fs.existsSync(reportPath)) {
  console.error('PRODUCT_JOURNEY_TEST_FAIL missing report');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failures = [];

if (report.schema !== 'eventlive.product-journey-audit.v1') failures.push('schema mismatch');
if (report.status !== 'PASS') failures.push(`status is ${report.status}`);
if (!report.summary || report.summary.journeys_checked < 4) failures.push('too few journeys checked');
if (report.summary.public_pages_dead_end_checked < 6) failures.push('too few dead-end pages checked');
if (report.summary.findings !== 0) failures.push('findings present');

const roles = new Set((report.journeys || []).map((journey) => journey.role));
for (const role of ['visitor', 'organizer', 'owner']) {
  if (!roles.has(role)) failures.push(`missing role ${role}`);
}

if (failures.length) {
  console.error(`PRODUCT_JOURNEY_TEST_FAIL ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`PRODUCT_JOURNEY_TEST_OK journeys=${report.summary.journeys_checked}`);
