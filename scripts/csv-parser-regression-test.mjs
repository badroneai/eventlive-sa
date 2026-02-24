import { spawnSync } from 'node:child_process';

const run = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_FILE: 'data/qa_csv_edge_cases.csv'
  }
});

const out = `${run.stdout || ''}\n${run.stderr || ''}`;

if (run.status !== 0) {
  console.error('TEST_FAIL csv parser should accept quoted comma/newline/escaped quote cases');
  console.error(out);
  process.exit(1);
}

const checks = [
  /Total rows:\s*3/i,
  /Total errors:\s*0/i,
  /PASS: schema validation successful\./i
];

const missing = checks.filter((re) => !re.test(out));
if (missing.length > 0) {
  console.error('TEST_FAIL csv parser output missing expected signals');
  missing.forEach((re) => console.error(`- ${re}`));
  console.error(out);
  process.exit(1);
}

console.log('TEST_OK csv parser regression checks passed');
