import assert from 'node:assert/strict';
import fs from 'node:fs';

const contracts = [
  ['scripts/source-deep-probe.mjs', 'EVENTLIVE_PROBE_SOURCE_IDS'],
  ['scripts/source-browser-probe.mjs', 'EVENTLIVE_BROWSER_SOURCE_IDS'],
  ['scripts/source-yield-report.mjs', 'EVENTLIVE_SOURCE_IDS'],
  ['scripts/collect-source-candidates.mjs', 'EVENTLIVE_SOURCE_IDS']
];

for (const [file, specializedVariable] of contracts) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /EVENTLIVE_SOURCE_IDS/, `${file} must support the shared source-selection variable`);
  assert.match(source, new RegExp(specializedVariable), `${file} must preserve its source-selection contract`);
}

console.log(`SOURCE_SELECTION_CONTRACT_OK scripts=${contracts.length}`);
