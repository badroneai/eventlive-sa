import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`OWNER_CENTER_TEST_FAIL ${message}`);
    process.exit(1);
  }
}

const requiredReports = [
  ['reports/eventlive-command-center.json', 'eventlive.command-center.v1'],
  ['reports/delivery-readiness-status.json', 'eventlive.delivery-readiness.v1'],
  ['reports/delivery-readiness-standard-status.json', 'eventlive.delivery-readiness-standard.v1'],
  ['reports/design-os-status.json', 'eventlive.design-os-status.v1'],
  ['reports/source-harvest-os-status.json', 'eventlive.harvest-os-status.v1'],
  ['reports/analytics-status.json', 'eventlive.analytics-status.v1']
];

for (const [relativePath, schema] of requiredReports) {
  const fullPath = path.join(root, relativePath);
  assert(fs.existsSync(fullPath), `${relativePath} missing`);
  const report = readJson(relativePath);
  assert(report.schema === schema, `${relativePath} schema mismatch`);
  assert(report.generated_at, `${relativePath} missing generated_at`);
}

const commandCenter = readJson('reports/eventlive-command-center.json');
assert(commandCenter.project?.name === 'EventLive', 'command center project name mismatch');
assert(commandCenter.project?.domain === 'eventme.live', 'command center domain mismatch');
assert(Array.isArray(commandCenter.gates) && commandCenter.gates.length >= 5, 'command center gates incomplete');
assert(commandCenter.gates.some((gate) => gate.name === 'Analytics'), 'analytics gate missing');
assert(commandCenter.gates.some((gate) => gate.name === 'Harvest OS'), 'harvest gate missing');
assert(commandCenter.gates.some((gate) => gate.name === 'Design OS'), 'design gate missing');
assert(commandCenter.gates.some((gate) => gate.name === '23-Gate Delivery Standard'), '23-gate delivery standard missing');

const analytics = readJson('reports/analytics-status.json');
assert(analytics.privacy?.cookies === false, 'analytics must remain cookieless');
assert(analytics.privacy?.pii === false, 'analytics must not collect PII');
assert(analytics.owner_excluded_paths?.includes('events.json'), 'owner/raw JSON exclusion missing');
assert(analytics.tracked_events?.includes('directions_clicked'), 'directions event missing');

const harvest = readJson('reports/source-harvest-os-status.json');
assert(harvest.operating_rule?.includes('Raw collection is not publication'), 'harvest operating rule missing');
assert(harvest.totals?.sources >= 1, 'harvest sources not counted');

const mdFiles = [
  'eventlive-command-center.md',
  'delivery-readiness-status.md',
  'delivery-readiness-standard-status.md',
  'design-os-status.md',
  'source-harvest-os-status.md',
  'analytics-status.md'
];
for (const file of mdFiles) {
  assert(fs.existsSync(path.join(reportsDir, file)), `${file} missing`);
}

console.log(`OWNER_CENTER_TEST_OK reports=${requiredReports.length} gates=${commandCenter.gates.length}`);
