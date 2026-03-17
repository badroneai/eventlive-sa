import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const baseFile = 'data/demo_program.json';
const qaFile = 'data/qa_samples_day2.json';
const outFile = path.join(process.cwd(), '03-Reports', 'data-qa-production-window1.md');

function runValidate(label, sourceFile) {
  const result = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, EVENTLIVE_SOURCE_FILE: sourceFile }
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const rowsMatch = output.match(/Total sessions:\s*(\d+)/i);
  const errorsMatch = output.match(/Total errors:\s*(\d+)/i);
  const rows = rowsMatch ? Number(rowsMatch[1]) : 0;
  const errors = errorsMatch ? Number(errorsMatch[1]) : 0;
  const rate = rows > 0 ? ((errors / rows) * 100).toFixed(1) : '0.0';
  return { label, rows, errors, rate };
}

const before = runValidate('before (demo program)', baseFile);
const after = runValidate('after (noisy production-like batch)', qaFile);

const report = [
  '# EventLive Data QA (Production Grade) — Window 1',
  `- Before: rows=${before.rows}, errors=${before.errors}, error_rate=${before.rate}%`,
  `- After: rows=${after.rows}, errors=${after.errors}, error_rate=${after.rate}%`,
  `- Delta errors: ${after.errors - before.errors}`,
  '',
  '## Gate Decision',
  after.errors === 0 ? '- PASS' : '- FAIL (expected on noisy batch; use as hard gate for production inputs)',
  '',
  '## Notes',
  '- Required/schema/chronology checks are active via validate + threshold gate.',
  '- Keep production feed blocked when error_rate > 0% unless explicit override.'
].join('\n');

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${report}\n`, 'utf8');
console.log(report);
