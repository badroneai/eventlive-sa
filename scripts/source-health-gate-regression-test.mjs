import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventlive-source-health-gate-'));
const fixturePath = path.join(tmpDir, 'source-health.json');
const growthPath = path.join(tmpDir, 'source-growth.json');

function writeFixture(overrides = {}) {
  const totals = {
    sources: 54,
    active_collectors: 20,
    collection_coverage_pct: 37,
    productive: 10,
    open_idle: 10,
    collector_errors: 0,
    probe_blocked: 8,
    extractor_backlog: 15,
    candidates_discovered: 61,
    candidates_written: 60,
    ...overrides.totals
  };
  const sources = Array.from({ length: totals.sources }, (_, index) => ({
    id: `source-${index + 1}`,
    priority: index + 1,
    status: index < totals.collector_errors ? 'collector-error' : 'productive'
  }));
  fs.writeFileSync(fixturePath, `${JSON.stringify({ totals, sources }, null, 2)}\n`, 'utf8');
}

function runGate(extraEnv = {}) {
  return execFileSync(process.execPath, ['scripts/source-health-gate.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      EVENTLIVE_SOURCE_HEALTH_FILE: fixturePath,
      EVENTLIVE_SOURCE_GROWTH_REPORT_JSON: growthPath,
      ...extraEnv
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

writeFixture();
fs.writeFileSync(growthPath, `${JSON.stringify({ current: { status: 'healthy', lost_published_output: false } }, null, 2)}\n`, 'utf8');
assert.match(runGate(), /SOURCE_HEALTH_OK/);

writeFixture({ totals: { active_collectors: 12 } });
assert.throws(() => runGate(), /SOURCE_HEALTH_FAIL/);

writeFixture({ totals: { collector_errors: 1 } });
assert.throws(() => runGate(), /SOURCE_HEALTH_FAIL/);

writeFixture({ totals: { collector_errors: 1 } });
assert.throws(() => runGate({
  EVENTLIVE_MAX_SOURCE_COLLECTOR_ERRORS: '10',
  EVENTLIVE_MAX_CRITICAL_SOURCE_ERRORS: '0'
}), /critical_collector_errors=1/);

writeFixture({ totals: { collector_errors: 11 } });
assert.match(runGate({
  EVENTLIVE_MAX_SOURCE_COLLECTOR_ERRORS: '12',
  EVENTLIVE_MAX_CRITICAL_SOURCE_ERRORS: '10',
  EVENTLIVE_CRITICAL_SOURCE_PRIORITY_MAX: '10'
}), /SOURCE_HEALTH_OK/);

writeFixture({ totals: { candidates_written: 10 } });
assert.throws(() => runGate(), /SOURCE_HEALTH_FAIL/);

writeFixture();
fs.writeFileSync(growthPath, `${JSON.stringify({ current: { status: 'critical-persistence-gap', lost_published_output: true, public_delta: 0, published_new: 2 } }, null, 2)}\n`, 'utf8');
assert.throws(() => runGate(), /published output was not preserved/);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('TEST_OK source health gate regression checks passed');
