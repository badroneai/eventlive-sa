import fs from 'node:fs';

const healthPath = process.env.EVENTLIVE_SOURCE_HEALTH_FILE || 'dist/source-health.json';
const minActiveCollectors = Number(process.env.EVENTLIVE_MIN_ACTIVE_COLLECTORS ?? 20);
const minCollectionCoveragePct = Number(process.env.EVENTLIVE_MIN_SOURCE_COLLECTION_COVERAGE_PCT ?? 35);
const minProductiveSources = Number(process.env.EVENTLIVE_MIN_PRODUCTIVE_SOURCES ?? 8);
const maxCollectorErrors = Number(process.env.EVENTLIVE_MAX_SOURCE_COLLECTOR_ERRORS ?? 0);
const criticalPriorityMax = Number(process.env.EVENTLIVE_CRITICAL_SOURCE_PRIORITY_MAX ?? 10);
const maxCriticalCollectorErrors = Number(process.env.EVENTLIVE_MAX_CRITICAL_SOURCE_ERRORS ?? 0);
const criticalErrorStreak = Math.max(1, Number(process.env.EVENTLIVE_CRITICAL_SOURCE_ERROR_STREAK ?? 2));
const minCandidatesWritten = Number(process.env.EVENTLIVE_MIN_SOURCE_CANDIDATES_WRITTEN ?? 50);
const maxProbeBlockedRatio = Number(process.env.EVENTLIVE_MAX_PROBE_BLOCKED_RATIO ?? 0.25);
const growthPath = process.env.EVENTLIVE_SOURCE_GROWTH_REPORT_JSON || 'reports/source-growth-report.json';

function fail(message) {
  console.error(`SOURCE_HEALTH_FAIL ${message}`);
  process.exit(1);
}

if (!fs.existsSync(healthPath)) {
  fail(`missing source health file: ${healthPath}`);
}

let health;
try {
  health = JSON.parse(fs.readFileSync(healthPath, 'utf8'));
} catch (error) {
  fail(`unable to parse ${healthPath}: ${error.message}`);
}

const totals = health.totals || {};
const sources = Array.isArray(health.sources) ? health.sources : [];
const activeCollectors = Number(totals.active_collectors || 0);
const coveragePct = Number(totals.collection_coverage_pct || 0);
const productive = Number(totals.productive || 0);
const collectorErrors = Number(totals.collector_errors || 0);
const candidatesWritten = Number(totals.candidates_written || 0);
const probeBlocked = Number(totals.probe_blocked || 0);
const probeBlockedRatio = sources.length ? probeBlocked / sources.length : 0;
const criticalCollectorErrors = sources.filter((source) => (
  source.status === 'collector-error'
  && Number(source.priority || Number.MAX_SAFE_INTEGER) <= criticalPriorityMax
));
const persistentCriticalCollectorErrors = criticalCollectorErrors.filter((source) => (
  Number(source.error_streak || 0) >= criticalErrorStreak
));

if (!sources.length) fail('no source rows in health file');
if (activeCollectors < minActiveCollectors) {
  fail(`active_collectors=${activeCollectors} min=${minActiveCollectors}`);
}
if (coveragePct < minCollectionCoveragePct) {
  fail(`collection_coverage_pct=${coveragePct} min=${minCollectionCoveragePct}`);
}
if (productive < minProductiveSources) {
  fail(`productive_sources=${productive} min=${minProductiveSources}`);
}
if (collectorErrors > maxCollectorErrors) {
  const errors = sources
    .filter((source) => source.status === 'collector-error')
    .map((source) => source.id)
    .join(', ');
  fail(`collector_errors=${collectorErrors} max=${maxCollectorErrors} sources=${errors}`);
}
if (persistentCriticalCollectorErrors.length > maxCriticalCollectorErrors) {
  fail(`persistent_critical_collector_errors=${persistentCriticalCollectorErrors.length} max=${maxCriticalCollectorErrors} priority_lte=${criticalPriorityMax} streak_gte=${criticalErrorStreak} sources=${persistentCriticalCollectorErrors.map((source) => source.id).join(', ')}`);
}
if (candidatesWritten < minCandidatesWritten) {
  fail(`candidates_written=${candidatesWritten} min=${minCandidatesWritten}`);
}
if (probeBlockedRatio > maxProbeBlockedRatio) {
  fail(`probe_blocked_ratio=${probeBlockedRatio.toFixed(2)} max=${maxProbeBlockedRatio}`);
}

let growthStatus = 'unavailable';
if (fs.existsSync(growthPath)) {
  try {
    const growth = JSON.parse(fs.readFileSync(growthPath, 'utf8'));
    const current = growth.current || {};
    growthStatus = current.status || 'unknown';
    if (current.lost_published_output === true || growthStatus === 'critical-persistence-gap') {
      // The counts alone were undiagnosable. This gate blocked publishing on
      // three consecutive runs on 2026-09-04 saying only
      // "public_delta=5 published_new=6", and the ids it had already computed
      // were sitting unprinted in its own input file. A gate that fires and
      // cannot say what is wrong costs the same attention as a false alarm.
      const missing = Array.isArray(current.missing_published_ids) ? current.missing_published_ids : [];
      const collapsed = Array.isArray(current.collapsed_published_ids) ? current.collapsed_published_ids : [];
      const detail = missing.length
        ? `\n  did not reach dist/events.json:\n    ${missing.join('\n    ')}`
        : '\n  (no ids recorded — the ledger flagged the run without naming a record, which is itself a bug)';
      const context = collapsed.length
        ? `\n  collapsed onto a primary and therefore NOT counted as lost:\n    ${collapsed.map((row) => `${row.id} → ${row.collapsed_onto || '?'} (${row.reason})`).join('\n    ')}`
        : '';
      fail(`published output was not preserved: public_delta=${current.public_delta} published_new=${current.published_new}${detail}${context}`);
    }
  } catch (error) {
    if (String(error?.message || '').startsWith('published output was not preserved')) throw error;
    fail(`unable to parse ${growthPath}: ${error.message}`);
  }
}

console.log([
  'SOURCE_HEALTH_OK',
  `active_collectors=${activeCollectors}`,
  `coverage=${coveragePct}%`,
  `productive=${productive}`,
  `collector_errors=${collectorErrors}`,
  `critical_collector_errors=${criticalCollectorErrors.length}`,
  `persistent_critical_errors=${persistentCriticalCollectorErrors.length}`,
  `candidates=${candidatesWritten}`,
  `probe_blocked_ratio=${probeBlockedRatio.toFixed(2)}`,
  `growth=${growthStatus}`
].join(' '));
