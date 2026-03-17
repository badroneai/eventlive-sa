import fs from 'node:fs';
import path from 'node:path';

const reportPath = path.join(process.cwd(), 'reports', 'reliability-rollup.md');
const minSamples = Number(process.env.SLO_MIN_SAMPLES || 8);
const outputPath = process.env.GITHUB_OUTPUT;

function setOutput(key, value) {
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${key}=${value}\n`, 'utf8');
}

if (!fs.existsSync(reportPath)) {
  setOutput('policy_state', 'FAIL');
  setOutput('enforcement_state', 'ACTIVE');
  setOutput('samples_total', '0');
  setOutput('samples_min', String(minSamples));
  setOutput('samples_progress', `0/${minSamples}`);
  console.error(`SLO_GATE_FAIL missing_report=${reportPath}`);
  process.exit(1);
}

const body = fs.readFileSync(reportPath, 'utf8');
const totalMatch = body.match(/- Total checks in window:\s*(\d+)/i);
const gateMatch = body.match(/- SLO gate:\s*(PASS|FAIL)/i);

if (!totalMatch || !gateMatch) {
  setOutput('policy_state', 'FAIL');
  setOutput('enforcement_state', 'ACTIVE');
  setOutput('samples_total', '0');
  setOutput('samples_min', String(minSamples));
  setOutput('samples_progress', `0/${minSamples}`);
  console.error('SLO_GATE_FAIL malformed_rollup_report');
  process.exit(1);
}

const total = Number(totalMatch[1]);
const gate = gateMatch[1].toUpperCase();
setOutput('samples_total', String(total));
setOutput('samples_min', String(minSamples));
setOutput('samples_progress', `${total}/${minSamples}`);

if (total < minSamples) {
  setOutput('policy_state', 'SKIPPED');
  setOutput('enforcement_state', 'INACTIVE');
  console.log(`SLO_GATE_SKIPPED insufficient_samples=${total} min_required=${minSamples}`);
  process.exit(0);
}

setOutput('enforcement_state', 'ACTIVE');

if (gate !== 'PASS') {
  setOutput('policy_state', 'FAIL');
  console.error(`SLO_GATE_FAIL gate=${gate} samples=${total} min_required=${minSamples}`);
  process.exit(1);
}

setOutput('policy_state', 'PASS');
console.log(`SLO_GATE_PASS gate=${gate} samples=${total} min_required=${minSamples}`);
