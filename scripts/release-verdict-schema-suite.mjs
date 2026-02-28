import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const checks = [
  { name: 'schema-positive', script: 'scripts/release-verdict-schema-ci-check.mjs' },
  { name: 'schema-negative-enum', script: 'scripts/release-verdict-schema-negative-ci-check.mjs' },
  {
    name: 'schema-negative-missing-required',
    script: 'scripts/release-verdict-schema-negative-missing-required-ci-check.mjs'
  },
  {
    name: 'schema-negative-additional-property',
    script: 'scripts/release-verdict-schema-negative-additional-property-ci-check.mjs'
  },
  {
    name: 'schema-negative-nested-type',
    script: 'scripts/release-verdict-schema-negative-nested-type-ci-check.mjs'
  }
];

const results = [];
const suiteStart = Date.now();

for (const check of checks) {
  const checkStart = Date.now();
  console.log(`SCHEMA_SUITE_CHECK_START ${check.name}`);
  const run = spawnSync(process.execPath, [check.script], {
    encoding: 'utf8',
    env: { ...process.env }
  });

  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);

  const durationMs = Date.now() - checkStart;
  const status = run.status === 0 ? 'PASS' : `FAIL(${run.status ?? 'null'})`;
  results.push({ name: check.name, status, durationMs });
  console.log(`SCHEMA_SUITE_CHECK_END ${check.name} status=${status} duration_ms=${durationMs}`);

  if (run.status !== 0) {
    console.error('SCHEMA_SUITE_FAIL stopping on first failure');
    break;
  }
}

const suiteDurationMs = Date.now() - suiteStart;
console.log('SCHEMA_SUITE_SUMMARY_START');
for (const r of results) {
  console.log(`SCHEMA_SUITE_RESULT ${r.name} ${r.status} duration_ms=${r.durationMs}`);
}
console.log(`SCHEMA_SUITE_TOTAL_DURATION_MS ${suiteDurationMs}`);
console.log('SCHEMA_SUITE_SUMMARY_END');

const failed = results.find((r) => r.status.startsWith('FAIL'));
const incomplete = results.length !== checks.length;
const suiteStatus = failed || incomplete ? 'FAIL' : 'PASS';

const nowIso = new Date().toISOString();
const reportLines = [
  '# Schema Suite Timing Report',
  '',
  `- generated_at: ${nowIso}`,
  `- status: ${suiteStatus}`,
  `- total_duration_ms: ${suiteDurationMs}`,
  '',
  '## Check Results',
  ...results.map((r) => `- ${r.name}: ${r.status} (duration_ms=${r.durationMs})`),
  ''
];

fs.mkdirSync(new URL('../reports/', import.meta.url), { recursive: true });
fs.writeFileSync(
  new URL('../reports/schema-suite-timing.md', import.meta.url),
  `${reportLines.join('\n')}\n`,
  'utf8'
);

if (failed) process.exit(1);

if (incomplete) {
  console.error('SCHEMA_SUITE_FAIL incomplete run');
  process.exit(1);
}

console.log('SCHEMA_SUITE_OK all schema checks passed');
