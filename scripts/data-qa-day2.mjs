import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const reportsDir = path.join(root, '03-Reports');
fs.mkdirSync(reportsDir, { recursive: true });

const run = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, EVENTLIVE_SOURCE_FILE: 'data/qa_samples_day2.json' }
});

const output = `${run.stdout || ''}\n${run.stderr || ''}`;
const lines = output.split(/\r?\n/).filter(Boolean);
const errors = lines.filter((line) => line.startsWith('- session') || line.startsWith('- program') || line.startsWith('- document'));

const categories = {
  required: 0,
  enum: 0,
  format: 0,
  chronology: 0,
  unexpected: 0
};

for (const error of errors) {
  const lower = error.toLowerCase();
  if (lower.includes('missing required') || lower.includes('minlength')) categories.required += 1;
  else if (lower.includes('outside enum')) categories.enum += 1;
  else if (lower.includes('invalid format')) categories.format += 1;
  else if (lower.includes('earlier than') || lower.includes('later than')) categories.chronology += 1;
  else if (lower.includes('unexpected field')) categories.unexpected += 1;
}

const total = Object.values(categories).reduce((a, b) => a + b, 0);
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
  `- Unexpected fields: ${categories.unexpected}`,
  `- Time chronology issues: ${categories.chronology}`,
  '',
  '## Operational Risk Notes',
  '- High: missing required metadata or session fields can block publishing.',
  '- Medium: enum/format errors can misclassify sessions or dates.',
  '- Medium: chronology errors can break the event-day schedule experience.',
  '',
  '## Raw Validator Output (excerpt)',
  '```',
  lines.slice(0, 60).join('\n'),
  '```'
].join('\n');

fs.writeFileSync(path.join(reportsDir, 'data-qa-day2.md'), `${report}\n`, 'utf8');
console.log(report);
process.exit(0);
