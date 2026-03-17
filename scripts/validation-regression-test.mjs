import { spawnSync } from 'node:child_process';

const run = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
  encoding: 'utf8',
  env: { ...process.env, EVENTLIVE_SOURCE_FILE: 'data/qa_validation_cases.json' }
});

const out = `${run.stdout || ''}\n${run.stderr || ''}`;
const checks = [
  /duplicate id/i,
  /end_at is earlier than start_at/i,
  /start_at is earlier than program\.event_start/i,
  /session_title has leading\/trailing whitespace/i
];

const missing = checks.filter((re) => !re.test(out));

if (run.status === 0) {
  console.error('TEST_FAIL validator unexpectedly passed invalid fixture');
  process.exit(1);
}

if (missing.length > 0) {
  console.error('TEST_FAIL missing expected checks in output');
  missing.forEach((re) => console.error(`- ${re}`));
  process.exit(1);
}

console.log('TEST_OK validation regression checks passed');
