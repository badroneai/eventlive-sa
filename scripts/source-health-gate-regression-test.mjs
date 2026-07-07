import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventlive-source-health-gate-'));
const fixturePath = path.join(tmpDir, 'source-health.json');

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
      ...extraEnv
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

writeFixture();
assert.match(runGate(), /SOURCE_HEALTH_OK/);

writeFixture({ totals: { active_collectors: 12 } });
assert.throws(() => runGate(), /SOURCE_HEALTH_FAIL/);

writeFixture({ totals: { collector_errors: 1 } });
assert.throws(() => runGate(), /SOURCE_HEALTH_FAIL/);

writeFixture({ totals: { candidates_written: 10 } });
assert.throws(() => runGate(), /SOURCE_HEALTH_FAIL/);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('TEST_OK source health gate regression checks passed');
