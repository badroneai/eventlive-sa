import fs from 'node:fs';

const p = 'reports/validation-report.md';
if (!fs.existsSync(p)) {
  console.error('THRESHOLD_FAIL missing validation report');
  process.exit(1);
}

const txt = fs.readFileSync(p, 'utf8');
const mRows = txt.match(/Total rows:\s*(\d+)/i);
const mErr = txt.match(/Total errors:\s*(\d+)/i);
const mWarn = txt.match(/Total warnings:\s*(\d+)/i);

const rows = mRows ? Number(mRows[1]) : NaN;
const errors = mErr ? Number(mErr[1]) : NaN;
const warnings = mWarn ? Number(mWarn[1]) : 0;

if (!Number.isFinite(rows) || !Number.isFinite(errors)) {
  console.error('THRESHOLD_FAIL unable to parse report metrics');
  process.exit(1);
}

const maxErrorRate = Number(process.env.EVENTLIVE_MAX_ERROR_RATE ?? 0);
const maxWarnings = Number(process.env.EVENTLIVE_MAX_WARNINGS ?? 25);
const errorRate = rows > 0 ? (errors / rows) * 100 : 0;

if (errors > 0 || errorRate > maxErrorRate) {
  console.error(`THRESHOLD_FAIL errors=${errors} rows=${rows} error_rate=${errorRate.toFixed(2)}% limit=${maxErrorRate}%`);
  process.exit(1);
}

if (warnings > maxWarnings) {
  console.error(`THRESHOLD_FAIL warnings=${warnings} limit=${maxWarnings}`);
  process.exit(1);
}

console.log(`THRESHOLD_OK errors=${errors} warnings=${warnings} rows=${rows} error_rate=${errorRate.toFixed(2)}%`);
