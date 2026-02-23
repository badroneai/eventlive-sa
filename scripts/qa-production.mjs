import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const baseFile = 'data/sample_clean.json';
const qaFile = 'data/qa_samples_day2.json';
const backupFile = 'data/sample_clean.backup.json';
const outFile = '03-Reports/data-qa-production-window1.md';

const original = fs.readFileSync(baseFile, 'utf8');
fs.writeFileSync(backupFile, original, 'utf8');

function runValidate(label, sourceContent) {
  fs.writeFileSync(baseFile, sourceContent, 'utf8');
  const r = spawnSync(process.execPath, ['scripts/validate-data.mjs'], { encoding: 'utf8' });
  const txt = `${r.stdout || ''}\n${r.stderr || ''}`;
  const mRows = txt.match(/Total rows:\s*(\d+)/i);
  const mErr = txt.match(/Total errors:\s*(\d+)/i);
  const rows = mRows ? Number(mRows[1]) : 0;
  const errors = mErr ? Number(mErr[1]) : 0;
  const rate = rows > 0 ? ((errors / rows) * 100).toFixed(1) : '0.0';
  return { label, rows, errors, rate, raw: txt };
}

const before = runValidate('before (clean sample)', original);
const qaContent = fs.readFileSync(qaFile, 'utf8');
const after = runValidate('after (noisy production-like batch)', qaContent);

fs.writeFileSync(baseFile, fs.readFileSync(backupFile, 'utf8'), 'utf8');
fs.unlinkSync(backupFile);

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
  '- Keep production feed blocked when error_rate > 0% unless explicit override.',
].join('\n');

fs.writeFileSync(outFile, report, 'utf8');
console.log(report);
