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
assert(commandCenter.gates.some((gate) => gate.name === 'National Coverage'), 'national coverage gate missing');
assert(typeof commandCenter.totals?.national_coverage_score === 'number', 'national coverage score missing');
assert(commandCenter.totals?.active_regions + commandCenter.totals?.zero_active_regions === 13, 'regional totals must reconcile');

const analytics = readJson('reports/analytics-status.json');
const analyticsMd = fs.readFileSync(path.join(reportsDir, 'analytics-status.md'), 'utf8');
assert(analytics.privacy?.cookies === false, 'analytics must remain cookieless');
assert(analytics.privacy?.pii === false, 'analytics must not collect PII');
assert(analytics.owner_excluded_paths?.includes('events.json'), 'owner/raw JSON exclusion missing');
assert(analytics.tracked_events?.includes('directions_clicked'), 'directions event missing');
assert(analytics.instrumentation_status === 'PASS', 'analytics instrumentation status missing');
// Vocabulary corrected 2026-09-03. "NEEDS_PROVIDER_SETUP" told the owner the
// provider was not set up — while Umami was installed, domain-locked and
// collecting normally. The only thing missing was the owner signing in to READ
// the numbers, which is what NEEDS_OWNER_LOGIN says. Still a closed set: an
// empty or invented status must fail.
assert(['ACTIVE', 'NEEDS_OWNER_LOGIN'].includes(analytics.dashboard_status), `analytics dashboard status must be ACTIVE or NEEDS_OWNER_LOGIN, got "${analytics.dashboard_status}"`);
assert(typeof analytics.dashboard_setup_required === 'boolean', 'analytics dashboard setup flag missing');
assert(/404/.test(analyticsMd), 'analytics owner note must explain Plausible 404');

const harvest = readJson('reports/source-harvest-os-status.json');
assert(harvest.operating_rule?.includes('Raw collection is not publication'), 'harvest operating rule missing');
assert(harvest.totals?.sources >= 1, 'harvest sources not counted');
assert(typeof harvest.totals?.collector_errors === 'number', 'harvest collector errors missing');
assert(typeof harvest.funnel?.published_new === 'number', 'harvest publication funnel missing');
assert(typeof harvest.funnel?.linked_existing === 'number', 'harvest linked-existing metric missing');
assert(typeof harvest.funnel?.blocked === 'number', 'harvest blocked metric missing');
assert(harvest.blocked_reasons && typeof harvest.blocked_reasons === 'object', 'harvest blocked reasons missing');
assert(Array.isArray(harvest.collector_error_sources), 'harvest collector error source list missing');

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
