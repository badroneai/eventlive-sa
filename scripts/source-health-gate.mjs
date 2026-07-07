import fs from 'node:fs';

const healthPath = process.env.EVENTLIVE_SOURCE_HEALTH_FILE || 'dist/source-health.json';
const minActiveCollectors = Number(process.env.EVENTLIVE_MIN_ACTIVE_COLLECTORS ?? 20);
const minCollectionCoveragePct = Number(process.env.EVENTLIVE_MIN_SOURCE_COLLECTION_COVERAGE_PCT ?? 35);
const minProductiveSources = Number(process.env.EVENTLIVE_MIN_PRODUCTIVE_SOURCES ?? 8);
const maxCollectorErrors = Number(process.env.EVENTLIVE_MAX_SOURCE_COLLECTOR_ERRORS ?? 0);
const minCandidatesWritten = Number(process.env.EVENTLIVE_MIN_SOURCE_CANDIDATES_WRITTEN ?? 50);
const maxProbeBlockedRatio = Number(process.env.EVENTLIVE_MAX_PROBE_BLOCKED_RATIO ?? 0.25);

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
if (candidatesWritten < minCandidatesWritten) {
  fail(`candidates_written=${candidatesWritten} min=${minCandidatesWritten}`);
}
if (probeBlockedRatio > maxProbeBlockedRatio) {
  fail(`probe_blocked_ratio=${probeBlockedRatio.toFixed(2)} max=${maxProbeBlockedRatio}`);
}

console.log([
  'SOURCE_HEALTH_OK',
  `active_collectors=${activeCollectors}`,
  `coverage=${coveragePct}%`,
  `productive=${productive}`,
  `collector_errors=${collectorErrors}`,
  `candidates=${candidatesWritten}`,
  `probe_blocked_ratio=${probeBlockedRatio.toFixed(2)}`
].join(' '));
