import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportPath = path.join(root, 'reports/delivery-readiness-standard-status.json');

function fail(message) {
  console.error(`DELIVERY_STANDARD_TEST_FAIL ${message}`);
  process.exit(1);
}

if (!fs.existsSync(reportPath)) {
  fail('missing reports/delivery-readiness-standard-status.json; run npm run readiness:standard first');
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

if (report.schema !== 'eventlive.delivery-readiness-standard.v1') {
  fail(`unexpected schema ${report.schema}`);
}

if (!Array.isArray(report.gates) || report.gates.length !== 23) {
  fail(`expected 23 gates, got ${report.gates?.length ?? 0}`);
}

const ids = new Set(report.gates.map((gate) => gate.id));
for (let index = 1; index <= 23; index += 1) {
  const id = String(index).padStart(2, '0');
  if (!ids.has(id)) fail(`missing gate ${id}`);
}

const validStatuses = new Set(['PASS', 'PARTIAL', 'NOT_STARTED', 'OWNER_RESERVED', 'N/A', 'FAIL']);
for (const gate of report.gates) {
  if (!validStatuses.has(gate.status)) fail(`gate ${gate.id} has invalid status ${gate.status}`);
  if (!gate.evidence || gate.evidence.length < 10) fail(`gate ${gate.id} missing useful evidence`);
  if (gate.status !== 'PASS' && gate.status !== 'N/A' && !gate.remaining) {
    fail(`gate ${gate.id} must explain remaining work when status=${gate.status}`);
  }
}

const blockingCount = report.gates.filter((gate) => ['PARTIAL', 'NOT_STARTED', 'FAIL'].includes(gate.status)).length;
if (blockingCount > 0 && report.release_verdict === 'READY_WITH_RESERVED_ITEMS') {
  fail('release verdict cannot be ready while partial/not-started/fail gates remain');
}

if (!report.metrics || report.metrics.public_events < 1) {
  fail('public event metric is missing or empty');
}

console.log(`DELIVERY_STANDARD_TEST_OK gates=${report.gates.length} blocking=${blockingCount} verdict=${report.release_verdict}`);
