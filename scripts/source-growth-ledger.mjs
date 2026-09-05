import fs from 'node:fs';
import path from 'node:path';
import { classifyPublishedOutput } from './published-output-persistence.mjs';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const statePath = path.join(root, process.env.EVENTLIVE_SOURCE_GROWTH_STATE_FILE || 'data/source_growth_state.json');
const reportJsonPath = path.join(root, process.env.EVENTLIVE_SOURCE_GROWTH_REPORT_JSON || 'reports/source-growth-report.json');
const reportMdPath = path.join(root, process.env.EVENTLIVE_SOURCE_GROWTH_REPORT_MD || 'reports/source-growth-report.md');
const catalogPath = path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE || 'data/events_catalog.json');
const endedPath = path.join(root, process.env.EVENTLIVE_SOURCE_ENDED_EVENTS_FILE || 'data/source_ended_events.json');
const publicEventsPath = path.join(root, process.env.EVENTLIVE_PUBLIC_EVENTS_FILE || 'dist/events.json');
const collectionPath = path.join(root, process.env.EVENTLIVE_SOURCE_COLLECTION_REPORT_JSON || 'reports/source-collection-report.json');
const publishPath = path.join(root, process.env.EVENTLIVE_SOURCE_AUTO_PUBLISH_REPORT_JSON || 'reports/source-auto-publish-report.json');
const runStatePath = path.join(root, process.env.EVENTLIVE_SOURCE_RUN_STATE_REPORT_JSON || 'reports/source-run-state-report.json');
const maxHistory = Math.max(12, Number(process.env.EVENTLIVE_SOURCE_GROWTH_HISTORY_LIMIT || 120));

// WO-9: `sources:growth:baseline` runs at the START of a sync cycle, before
// `sources:collect` and `npm run build` have executed. At that point in the
// cycle, dist/events.json is whatever was last committed to git (the sync
// workflow's persist step never adds dist/ back to the repo) and
// reports/source-collection-report.json is still THIS cycle's PREVIOUS-cycle
// leftover (collect hasn't refreshed it yet), so its `collected_at` collides
// with the run_id the previous cycle's post-build measurement already used.
// A baseline write therefore overwrites yesterday's real, post-build
// measurement with a stale pre-build snapshot every single cycle -- a
// frozen-gauge class bug. The fix is structural: baseline mode never writes
// state or reports. It only prints the last known (already-persisted, real)
// measurement for CI visibility. Only the post-build invocation
// (`sources:growth`, run after `npm run build`) is ever allowed to append or
// overwrite a ledger row.
const isBaselineInvocation = process.argv.includes('--baseline');

function arrayLength(envelope = {}, keys = []) {
  if (Array.isArray(envelope)) return envelope.length;
  for (const key of keys) if (Array.isArray(envelope?.[key])) return envelope[key].length;
  return 0;
}

function sum(rows = [], key = '') {
  return rows.reduce((total, row) => total + Number(row?.[key] || 0), 0);
}

function normalizeId(value = '') {
  // Arabic ids (e.g. "event-بلاتو") can arrive in different Unicode
  // normalization forms depending on the text pipeline that produced them
  // (extraction vs. build). Compare everything as NFC so an encoding
  // difference is never mistaken for a genuinely missing event.
  return String(value || '').normalize('NFC');
}

// WO-9b: the original lost_published_output heuristic assumed every publish
// must increase the NET public count (`published_new > max(0, publicDelta)`).
// That's false under ordinary churn -- publishing N new events while N (or
// more) previously-public events age out in the SAME cycle nets to
// public_delta=0 with nothing actually lost. The WO-9 fix to the frozen
// baseline gauge exposed this: honest deltas (no longer permanently
// inflated by the frozen-gauge bug) hit this flawed assumption on the very
// first live cycle and false-alarmed the health gate.
//
// Replaced with an IDENTITY check: a publish is only "lost" when an id this
// cycle's auto-publish report says it published is genuinely ABSENT from
// the built dist/events.json. This is immune to churn because it doesn't
// care about the net count at all -- it only asks "did the specific things
// we just published make it into the output."
//
// Returns true (genuinely lost -- alarm), false (nothing lost or nothing
// published), or null (the auto-publish report doesn't correlate with this
// run -- e.g. a stale leftover from an earlier cycle because auto-publish
// didn't rerun this cycle -- skip the check rather than false-alarm on
// data that was never trying to describe this run).
// Not every id absent from dist/events.json was lost. The build drops records on
// purpose and, since it started recording them, says which and why:
//
//   duplicate-id / duplicate-semantic / duplicate-source-identity
//       collapsed onto a named primary — the event IS published, under that
//       primary. Measured on one ordinary build: 23 of 26 drops.
//   not-public-launch-record
//       the build refuses to publish it at all. That is a genuine contradiction
//       — auto-publish said publish, the build said no — and still alarms, now
//       with the reason attached instead of a bare count.
//
// Before this, all three were indistinguishable from "vanished", and the health
// gate blocked publishing on all of them. It blocked three consecutive runs on
// 2026-09-04, and the log could not name a single id.
function loadBuildExclusions(root) {
  const file = path.join(root, 'reports', 'build-record-exclusions.json');
  const byId = new Map();
  if (!fs.existsSync(file)) return byId;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const row of Array.isArray(parsed?.excluded) ? parsed.excluded : []) {
      if (row?.id) byId.set(normalizeId(row.id), row);
      if (row?.slug) byId.set(normalizeId(row.slug), row);
    }
  } catch {
    return new Map();
  }
  return byId;
}

function checkPublishedOutputPersisted({ collection, publish, publicEvents, buildExclusions = new Map() }) {
  const publishedIds = [...new Set(
    (Array.isArray(publish?.published) ? publish.published : [])
      .map((item) => item?.event_id)
      .filter(Boolean)
  )];
  if (!publishedIds.length) {
    return { lostPublishedOutput: false, missingPublishedIds: [], publishReportCorrelated: true, publishedIdsChecked: 0 };
  }

  const collectedAt = collection?.collected_at;
  const publishedAt = publish?.published_at;
  // Within a healthy cycle, sources:collect writes collected_at BEFORE
  // sources:auto-publish writes published_at. If published_at predates this
  // run's own collected_at, the publish report is a leftover from an
  // earlier cycle (auto-publish didn't run/refresh this cycle) -- it has no
  // business informing THIS run's persistence check.
  const publishReportCorrelated = !publishedAt
    ? false
    : !collectedAt
      ? true // nothing to correlate against (e.g. first run) -- trust it
      : String(publishedAt) >= String(collectedAt);

  if (!publishReportCorrelated) {
    return { lostPublishedOutput: null, missingPublishedIds: [], publishReportCorrelated, publishedIdsChecked: publishedIds.length };
  }

  const distIds = new Set(
    (Array.isArray(publicEvents?.events) ? publicEvents.events : [])
      .map((event) => normalizeId(event?.id))
  );
  const classified = classifyPublishedOutput({ publishedIds, distIds, buildExclusions });
  return {
    lostPublishedOutput: classified.lost,
    missingPublishedIds: classified.missing,
    collapsedPublishedIds: classified.collapsed,
    publishReportCorrelated,
    publishedIdsChecked: publishedIds.length
  };
}

function buildGrowthRun({ generatedAt, catalog, ended, publicEvents, collection, publish, runState }) {
  const sourceRows = Array.isArray(collection?.sources) ? collection.sources : [];
  const persistence = checkPublishedOutputPersisted({ collection, publish, publicEvents, buildExclusions: loadBuildExclusions(process.cwd()) });
  return {
    run_id: collection?.collected_at || publish?.published_at || generatedAt,
    generated_at: generatedAt,
    collected_at: collection?.collected_at || '',
    catalog_active_rows: arrayLength(catalog, ['events']),
    catalog_ended_rows: arrayLength(ended, ['ended_events', 'archived_events']),
    public_events: arrayLength(publicEvents, ['events']),
    candidates_discovered: Number(collection?.candidates_discovered || 0),
    new_active_candidates: sum(sourceRows, 'new_candidates'),
    new_ended_events: sum(sourceRows, 'ended_new'),
    published_new: Number(publish?.totals?.published || publish?.published?.length || 0),
    linked_existing: Number(publish?.totals?.linked_existing || publish?.linked_existing?.length || 0),
    blocked_remaining: Number(publish?.totals?.blocked || publish?.blocked?.length || 0),
    sources_attempted: Number(collection?.sources_attempted || runState?.totals?.attempted || 0),
    productive_sources: Number(runState?.totals?.productive || sourceRows.filter((row) => row.status === 'ok' && Number(row.extracted || 0) > 0).length),
    collector_errors: Number(runState?.totals?.collector_errors || sourceRows.filter((row) => row.status === 'error').length),
    // WO-9b: identity-based persistence check (tri-state true/false/null --
    // see checkPublishedOutputPersisted). This is computed HERE, once, while
    // the raw publish/dist data is available, and simply carried forward by
    // appendGrowthRun afterward -- it can never be recomputed from delta
    // math alone once this row is historical.
    lost_published_output: persistence.lostPublishedOutput,
    collapsed_published_ids: persistence.collapsedPublishedIds || [],
    missing_published_ids: persistence.missingPublishedIds,
    published_ids_checked: persistence.publishedIdsChecked,
    publish_report_correlated: persistence.publishReportCorrelated
  };
}

function appendGrowthRun(previousRuns = [], run, limit = maxHistory) {
  const byId = new Map(previousRuns.map((item) => [item.run_id, item]));
  // A freshly-built run always represents a real measurement, so it clears
  // any 'poisoned-frozen-gauge-wo9' tag left on a prior row for this
  // run_id (WO-9 requirement 2: self-heal once a real re-measurement lands).
  // Untouched rows (any other run_id already in byId) keep whatever tag
  // they had -- see the map() below.
  byId.set(run.run_id, { ...byId.get(run.run_id), ...run, measurement_integrity: run.measurement_integrity || 'ok' });
  const ordered = [...byId.values()]
    .sort((a, b) => String(a.run_id).localeCompare(String(b.run_id)))
    .slice(-limit);
  let noGrowthStreak = 0;
  return ordered.map((item, index) => {
    const previous = ordered[index - 1];
    const publicDelta = previous ? item.public_events - previous.public_events : null;
    const catalogDelta = previous
      ? (item.catalog_active_rows + item.catalog_ended_rows) - (previous.catalog_active_rows + previous.catalog_ended_rows)
      : null;
    noGrowthStreak = publicDelta === null || publicDelta > 0 ? 0 : noGrowthStreak + 1;
    // WO-9b: lost_published_output is NOT recomputed here. It was set once,
    // by buildGrowthRun, at the moment the raw publish report + built
    // dist/events.json were both available for THIS row (identity check --
    // see checkPublishedOutputPersisted). `item` already carries it forward
    // via the `...item` spread below, whether that's a fresh tri-state
    // value for the row just written, or an untouched historical row's
    // already-persisted value. Strict `=== true` mirrors
    // source-health-gate.mjs's own check, so `null` (report didn't
    // correlate with this run) and `false` both correctly stay silent.
    const status = item.lost_published_output === true
      ? 'critical-persistence-gap'
      : item.collector_errors > 0 || noGrowthStreak >= 4
        ? 'degraded'
        : publicDelta === null
          ? 'baseline'
          : 'healthy';
    return {
      ...item,
      public_delta: publicDelta,
      catalog_delta: catalogDelta,
      no_growth_streak: noGrowthStreak,
      status,
      // WO-9: rows touched by byId.set() above are always tagged 'ok'
      // (real measurement); rows left untouched carry forward whatever
      // measurement_integrity they already had (e.g. a migrated
      // 'poisoned-frozen-gauge-wo9' tag). Default to 'ok' only as a safety
      // net for legacy rows that predate this field entirely.
      measurement_integrity: item.measurement_integrity || 'ok'
    };
  });
}

function renderMarkdown(report) {
  const current = report.current;
  return `# EventLive Source Growth\n\n- generated_at: ${report.generated_at}\n- status: ${current.status}\n- public_events: ${current.public_events}\n- public_delta: ${current.public_delta ?? 'baseline'}\n- new_active_candidates: ${current.new_active_candidates}\n- new_ended_events: ${current.new_ended_events}\n- published_new: ${current.published_new}\n- collector_errors: ${current.collector_errors}\n- no_growth_streak: ${current.no_growth_streak}\n\n| Run | Public | Delta | New candidates | New ended | Published | Errors | Status |\n|---|---:|---:|---:|---:|---:|---:|---|\n${report.runs.slice(-12).reverse().map((row) => `| ${row.run_id} | ${row.public_events} | ${row.public_delta ?? '-'} | ${row.new_active_candidates} | ${row.new_ended_events} | ${row.published_new} | ${row.collector_errors} | ${row.status} |`).join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const previous = exists(statePath) ? readJson(statePath) : { runs: [] };

  if (isBaselineInvocation) {
    // Read-only: print the last already-persisted (real, post-build)
    // measurement for CI visibility. Never write state/report files here --
    // see the WO-9 comment above isBaselineInvocation for why.
    const current = previous.runs?.at(-1) || null;
    if (current) {
      console.log(
        `SOURCE_GROWTH_BASELINE (read-only, not persisted) last_status=${current.status} ` +
        `last_public=${current.public_events} last_delta=${current.public_delta ?? 'baseline'} ` +
        `last_no_growth_streak=${current.no_growth_streak}`
      );
    } else {
      console.log('SOURCE_GROWTH_BASELINE (read-only, not persisted) no prior measurements in state');
    }
    return;
  }

  const run = buildGrowthRun({
    generatedAt,
    catalog: readJson(catalogPath),
    ended: readJson(endedPath),
    publicEvents: readJson(publicEventsPath),
    collection: readJson(collectionPath),
    publish: readJson(publishPath),
    runState: readJson(runStatePath)
  });
  const runs = appendGrowthRun(previous.runs || [], run);
  const state = {
    schema: 'eventlive.source-growth-state.v1',
    generated_at: generatedAt,
    runs,
    // WO-9b (self-caught follow-up to WO-9): main() used to rebuild `state`
    // from scratch every run, silently dropping the WO-9 poisoned-history
    // `discontinuities` annotation on the very next real sync cycle after
    // the WO-9 fix landed (verified: present in commit fe948662, gone by
    // the next sync commit 86947532 -- one cycle later). Carry it forward
    // explicitly so an annotated discontinuity survives for good, the same
    // way `runs[].measurement_integrity` already does.
    ...(previous.discontinuities ? { discontinuities: previous.discontinuities } : {})
  };
  const report = {
    schema: 'eventlive.source-growth-report.v1',
    generated_at: generatedAt,
    state: rel(statePath),
    current: runs.at(-1),
    runs
  };
  ensureDir(path.dirname(statePath));
  ensureDir(path.dirname(reportJsonPath));
  writeJson(statePath, state);
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, renderMarkdown(report), 'utf8');
  console.log(`SOURCE_GROWTH status=${report.current.status} public=${report.current.public_events} delta=${report.current.public_delta ?? 'baseline'} no_growth_streak=${report.current.no_growth_streak}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

export { appendGrowthRun, buildGrowthRun, renderMarkdown };
