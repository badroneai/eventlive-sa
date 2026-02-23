import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reportsDir = path.join(root, '03-Reports');
fs.mkdirSync(reportsDir, { recursive: true });

const input = path.join(root, 'data', 'qa_samples_day2.json');
const tempSample = path.join(root, 'data', 'sample_clean.json');
const backup = path.join(root, 'data', 'sample_clean.backup.json');

if (!fs.existsSync(input)) throw new Error('Missing input file: data/qa_samples_day2.json');

const original = fs.readFileSync(tempSample, 'utf8');
fs.writeFileSync(backup, original, 'utf8');
fs.writeFileSync(tempSample, fs.readFileSync(input, 'utf8'), 'utf8');

const run = spawnSync(process.execPath, ['scripts/validate-data.mjs'], { cwd: root, encoding: 'utf8' });

// Restore sample_clean.json
after();
function after(){
  if (fs.existsSync(backup)) {
    fs.writeFileSync(tempSample, fs.readFileSync(backup, 'utf8'), 'utf8');
    fs.unlinkSync(backup);
  }
}

const output = `${run.stdout || ''}\n${run.stderr || ''}`;
const lines = output.split(/\r?\n/).filter(Boolean);
const errors = lines.filter((l) => l.includes(':'));

const categories = {
  required: 0,
  enum: 0,
  format: 0,
  range: 0,
  unexpected: 0,
  chronology: 0
};

for (const e of errors) {
  const lower = e.toLowerCase();
  if (lower.includes('missing required') || lower.includes('minlength')) categories.required++;
  else if (lower.includes('outside enum')) categories.enum++;
  else if (lower.includes('invalid format')) categories.format++;
  else if (lower.includes('must be >=')) categories.range++;
  else if (lower.includes('unexpected field')) categories.unexpected++;
  else if (lower.includes('earlier than start_at')) categories.chronology++;
}

const total = Object.values(categories).reduce((a,b)=>a+b,0);
const now = new Date().toISOString();
const report = [
  '# EventLive Day 2 — Data QA Report',
  `- Generated at: ${now}`,
  '- Input file: `data/qa_samples_day2.json`',
  `- Validator exit code: ${run.status}`,
  `- Total classified errors: ${total}`,
  '',
  '## Error Breakdown',
  `- Missing required fields: ${categories.required}`,
  `- Enum violations: ${categories.enum}`,
  `- Format violations: ${categories.format}`,
  `- Range violations: ${categories.range}`,
  `- Unexpected fields: ${categories.unexpected}`,
  `- Time chronology issues: ${categories.chronology}`,
  '',
  '## Operational Risk Notes',
  '- High: missing required fields can break rendering contracts.',
  '- Medium: enum/format errors can misclassify sessions.',
  '- Medium: range errors impact seat/capacity trustworthiness.',
  '',
  '## Raw Validator Output (excerpt)',
  '```',
  lines.slice(0, 60).join('\n'),
  '```'
].join('\n');

fs.writeFileSync(path.join(reportsDir, 'data-qa-day2.md'), report, 'utf8');
console.log(report);
if (run.status === 0) process.exit(0);
process.exit(0);
