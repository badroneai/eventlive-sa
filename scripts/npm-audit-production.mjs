// Production dependency audit with an ACTIONABLE failure message.
//
// This used to be a bare `npm audit --omit=dev --json > reports/...` in
// package.json. It worked — on 2026-08-03 a new undici advisory turned it red
// and, exactly as designed, the sync still published while the run went red.
// But the run told you only `FAIL  audit:dependencies`: to learn *which*
// package, *which* advisory, and whether a fix existed you had to open the
// run, find the step, and read a JSON blob. Six syncs went red over two days
// before a human dug into it.
//
// A gate that fires and cannot say what is wrong costs the same attention as
// a false alarm, so it teaches the same habit of ignoring it. This wrapper
// keeps the identical verdict (npm's own exit code, unchanged) and the
// identical report file, and adds the one thing that was missing: a summary a
// human can act on from the run's own log, plus a ::error:: annotation.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const reportPath = path.join(process.cwd(), 'reports', 'npm-audit-production.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });

const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const raw = result.stdout || '';
fs.writeFileSync(reportPath, raw, 'utf8');

// npm exits non-zero when it finds vulnerabilities at or above its threshold,
// and also on real errors (network, malformed tree). Both must stay failures —
// we only add reporting, never our own verdict.
const exitCode = result.status === null ? 1 : result.status;

let report = null;
try {
  report = JSON.parse(raw);
} catch {
  console.error('NPM_AUDIT_PRODUCTION_UNPARSEABLE npm audit produced no parseable JSON');
  if (result.stderr) console.error(result.stderr.trim().split('\n').slice(0, 5).join('\n'));
  process.exit(exitCode || 1);
}

const manifestDependencies = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).dependencies || {};
const vulns = Object.values(report.vulnerabilities || {});
const direct = vulns.filter((item) => item.severity && item.severity !== 'info');
const totals = report.metadata?.vulnerabilities || {};
const counted = ['critical', 'high', 'moderate', 'low'].map((level) => `${level}=${totals[level] ?? 0}`).join(' ');

if (exitCode === 0 && direct.length === 0) {
  console.log(`NPM_AUDIT_PRODUCTION_OK ${counted}`);
  process.exit(0);
}

console.error(`NPM_AUDIT_PRODUCTION_FAIL ${counted}`);
for (const item of direct.sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
  const advisories = (item.via || [])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => entry.url || entry.title)
    .filter(Boolean);
  // "direct" must mean declared in our package.json, not merely "npm audit
  // listed no effects for it" — undici in the 2026-08-03 advisory had empty
  // effects yet arrives through cheerio, and mislabelling where a
  // vulnerability enters the tree sends whoever fixes it to the wrong file.
  const declared = Object.prototype.hasOwnProperty.call(manifestDependencies, item.name);
  const reachedThrough = (item.effects || []).filter(Boolean);
  const paths = declared
    ? ' (direct dependency in package.json)'
    : reachedThrough.length
      ? ` (transitive, reached through: ${reachedThrough.join(', ')})`
      : ` (transitive — run \`npm ls ${item.name} --omit=dev\` for the path)`;
  const fix = item.fixAvailable === true
    ? 'fix: `npm audit fix --package-lock-only --omit=dev`'
    : item.fixAvailable && typeof item.fixAvailable === 'object'
      ? `fix: upgrade to ${item.fixAvailable.name}@${item.fixAvailable.version}${item.fixAvailable.isSemVerMajor ? ' (MAJOR — review before taking)' : ''}`
      : 'no automatic fix available — needs a manual decision';
  console.error(`  - ${item.name} ${item.range || ''} [${item.severity}]${paths} — ${fix}`);
  for (const advisory of advisories.slice(0, 5)) console.error(`      ${advisory}`);
}
console.error(`::error::NPM_AUDIT_PRODUCTION_FAIL production dependencies carry ${direct.length} vulnerable package(s) (${counted}). See the lines above for the package, the advisories and the available fix; full JSON in reports/npm-audit-production.json`);

process.exit(exitCode || 1);
