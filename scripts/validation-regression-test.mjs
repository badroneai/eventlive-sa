import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const baseFile = 'data/sample_clean.json';
const backupFile = 'data/sample_clean.backup.json';
const qaFile = 'data/qa_validation_cases.json';

const original = fs.readFileSync(baseFile, 'utf8');
fs.writeFileSync(backupFile, original, 'utf8');

try {
  fs.writeFileSync(baseFile, fs.readFileSync(qaFile, 'utf8'), 'utf8');

  const run = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
    encoding: 'utf8'
  });

  const out = `${run.stdout || ''}\n${run.stderr || ''}`;
  const checks = [
    /duplicate id/i,
    /available_seats cannot exceed capacity/i,
    /end_at is earlier than start_at/i,
    /leading\/trailing whitespace/i
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
} finally {
  fs.writeFileSync(baseFile, fs.readFileSync(backupFile, 'utf8'), 'utf8');
  fs.unlinkSync(backupFile);
}
