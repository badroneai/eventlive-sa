import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outputPath = 'workspaces/_csv-parser-regression/current-program.json';

fs.rmSync(path.dirname(outputPath), { recursive: true, force: true });

const normalize = spawnSync(process.execPath, ['scripts/normalize-program.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_INTAKE_FILE: 'data/qa_csv_edge_cases.csv',
    EVENTLIVE_NORMALIZED_OUTPUT: outputPath
  }
});

if (normalize.status !== 0) {
  console.error('TEST_FAIL csv parser should normalize quoted comma/newline/escaped quote cases');
  console.error(`${normalize.stdout || ''}\n${normalize.stderr || ''}`);
  process.exit(1);
}

const validate = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_FILE: outputPath
  }
});

const out = `${normalize.stdout || ''}\n${validate.stdout || ''}\n${validate.stderr || ''}`;

if (validate.status !== 0) {
  console.error('TEST_FAIL normalized CSV edge cases should validate');
  console.error(out);
  process.exit(1);
}

const document = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
const titles = document.sessions.map((session) => session.session_title);
const checks = [
  /Total sessions:\s*3/i,
  /Total errors:\s*0/i,
  /PASS: schema validation successful\./i
];

const missing = checks.filter((re) => !re.test(out));
if (
  missing.length > 0 ||
  !titles.includes('جلسة فيها فاصلة، داخل العنوان') ||
  !titles.includes('عنوان متعدد\nالأسطر') ||
  !titles.includes('قال "مرحبا" في العنوان')
) {
  console.error('TEST_FAIL csv parser output missing expected signals');
  missing.forEach((re) => console.error(`- ${re}`));
  console.error(out);
  process.exit(1);
}

console.log('TEST_OK csv parser regression checks passed');
