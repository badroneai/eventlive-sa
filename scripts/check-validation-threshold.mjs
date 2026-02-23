import fs from 'node:fs';

const p = 'reports/validation-report.md';
if (!fs.existsSync(p)) {
  console.error('THRESHOLD_FAIL missing validation report');
  process.exit(1);
}
const txt = fs.readFileSync(p, 'utf8');
const m = txt.match(/Total errors:\s*(\d+)/i);
const count = m ? Number(m[1]) : NaN;
if (!Number.isFinite(count)) {
  console.error('THRESHOLD_FAIL unable to parse errors count');
  process.exit(1);
}
if (count > 0) {
  console.error(`THRESHOLD_FAIL critical errors=${count}`);
  process.exit(1);
}
console.log('THRESHOLD_OK critical errors=0');
