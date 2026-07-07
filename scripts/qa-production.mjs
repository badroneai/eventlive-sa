import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const baseFile = 'data/demo_program.json';
const qaFile = 'data/qa_samples_day2.json';
const outFile = path.join(process.cwd(), '03-Reports', 'data-qa-production-window1.md');
const noisyOutFile = path.join(process.cwd(), '03-Reports', 'data-qa-negative-noisy-batch.md');
const noisyMode = process.argv.includes('--noisy-negative');

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
  return { label, rows, errors, rate, status: result.status || 0, output };
}

function runScript(label, scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    encoding: 'utf8',
    env: { ...process.env }
  });
  return {
    label,
    status: result.status || 0,
    output: `${result.stdout || ''}\n${result.stderr || ''}`.trim()
  };
}

function writeReport(filePath, lines) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
  console.log(lines.join('\n'));
}

if (noisyMode) {
  const before = runValidate('before (demo program)', baseFile);
  const after = runValidate('after (noisy production-like batch)', qaFile);
  const expectedBlocked = after.errors > 0 || after.status !== 0;
  const lines = [
    '# EventLive Data QA Negative Control — Noisy Batch',
    `- Before: rows=${before.rows}, errors=${before.errors}, error_rate=${before.rate}%`,
    `- Noisy batch: rows=${after.rows}, errors=${after.errors}, error_rate=${after.rate}%`,
    `- Delta errors: ${after.errors - before.errors}`,
    '',
    '## Gate Decision',
    expectedBlocked ? '- PASS: noisy batch was blocked as expected.' : '- FAIL: noisy batch unexpectedly passed.',
    '',
    '## Notes',
    '- This is a negative control, not the production publish gate.',
    '- Use this to prove bad incoming batches fail closed before they reach the public catalog.'
  ];
  writeReport(noisyOutFile, lines);
  process.exit(expectedBlocked ? 0 : 1);
}

const validation = runValidate('canonical catalog validation', baseFile);
const prelaunch = runScript('public dist prelaunch quality', 'scripts/prelaunch-data-quality-regression-test.mjs');
const prelaunchReportPath = path.join(process.cwd(), 'reports', 'prelaunch-data-quality-report.json');
const prelaunchReport = fs.existsSync(prelaunchReportPath)
  ? JSON.parse(fs.readFileSync(prelaunchReportPath, 'utf8'))
  : null;
const catalogOk = validation.status === 0 && validation.errors === 0;
const publicOk = prelaunch.status === 0 && prelaunchReport?.ok === true;
const ok = catalogOk && publicOk;

const totals = prelaunchReport?.totals || {};
const lines = [
  '# EventLive Data QA (Production Gate) — Window 1',
  `- Catalog validation: ${catalogOk ? 'PASS' : 'FAIL'} (rows=${validation.rows}, errors=${validation.errors}, error_rate=${validation.rate}%)`,
  `- Public dist quality: ${publicOk ? 'PASS' : 'FAIL'}`,
  `- Events: ${totals.events ?? 'n/a'}`,
  `- Upcoming/active: ${totals.upcoming_or_active ?? 'n/a'}`,
  `- Ended: ${totals.ended ?? 'n/a'}`,
  `- Live-ready: ${totals.live_ready ?? 'n/a'}`,
  `- Cities: ${totals.cities ?? 'n/a'}`,
  `- Categories: ${totals.categories ?? 'n/a'}`,
  `- Local images: ${totals.local_images ?? 'n/a'}`,
  '',
  '## Gate Decision',
  ok ? '- PASS' : '- FAIL',
  '',
  '## Notes',
  '- This is the production publish gate for the canonical catalog and generated public site.',
  '- The noisy-batch fail-closed check moved to `npm run qa:prod:noisy`.'
];

writeReport(outFile, lines);
process.exit(ok ? 0 : 1);
