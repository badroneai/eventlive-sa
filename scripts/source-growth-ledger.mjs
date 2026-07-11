import fs from 'node:fs';
import path from 'node:path';
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

function arrayLength(envelope = {}, keys = []) {
  if (Array.isArray(envelope)) return envelope.length;
  for (const key of keys) if (Array.isArray(envelope?.[key])) return envelope[key].length;
  return 0;
}

function sum(rows = [], key = '') {
  return rows.reduce((total, row) => total + Number(row?.[key] || 0), 0);
}

function buildGrowthRun({ generatedAt, catalog, ended, publicEvents, collection, publish, runState }) {
  const sourceRows = Array.isArray(collection?.sources) ? collection.sources : [];
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
    collector_errors: Number(runState?.totals?.collector_errors || sourceRows.filter((row) => row.status === 'error').length)
  };
}

function appendGrowthRun(previousRuns = [], run, limit = maxHistory) {
  const byId = new Map(previousRuns.map((item) => [item.run_id, item]));
  byId.set(run.run_id, { ...byId.get(run.run_id), ...run });
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
    const lostPublishedOutput = publicDelta !== null && item.published_new > Math.max(0, publicDelta);
    const status = lostPublishedOutput
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
      lost_published_output: lostPublishedOutput,
      status
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
    runs
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
