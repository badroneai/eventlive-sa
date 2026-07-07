import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const registryPath = process.env.EVENTLIVE_SOURCE_REGISTRY_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_REGISTRY_FILE)
  : path.join(root, 'data', 'source_registry.json');
const statePath = process.env.EVENTLIVE_SOURCE_RUN_STATE_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_RUN_STATE_FILE)
  : path.join(root, 'data', 'source_run_state.json');
const reportJsonPath = process.env.EVENTLIVE_SOURCE_RUN_STATE_REPORT_JSON
  ? path.join(root, process.env.EVENTLIVE_SOURCE_RUN_STATE_REPORT_JSON)
  : path.join(root, 'reports', 'source-run-state-report.json');
const reportMdPath = process.env.EVENTLIVE_SOURCE_RUN_STATE_REPORT_MD
  ? path.join(root, process.env.EVENTLIVE_SOURCE_RUN_STATE_REPORT_MD)
  : path.join(root, 'reports', 'source-run-state-report.md');
const collectionReportPath = process.env.EVENTLIVE_SOURCE_COLLECTION_REPORT_JSON
  ? path.join(root, process.env.EVENTLIVE_SOURCE_COLLECTION_REPORT_JSON)
  : path.join(root, 'reports', 'source-collection-report.json');
const yieldReportPath = process.env.EVENTLIVE_SOURCE_YIELD_REPORT_JSON
  ? path.join(root, process.env.EVENTLIVE_SOURCE_YIELD_REPORT_JSON)
  : path.join(root, 'reports', 'source-yield-report.json');
const planPath = process.env.EVENTLIVE_SOURCE_INGESTION_PLAN_JSON
  ? path.join(root, process.env.EVENTLIVE_SOURCE_INGESTION_PLAN_JSON)
  : path.join(root, 'reports', 'source-ingestion-plan.json');
const probeReportPath = process.env.EVENTLIVE_SOURCE_DEEP_PROBE_REPORT_JSON
  ? path.join(root, process.env.EVENTLIVE_SOURCE_DEEP_PROBE_REPORT_JSON)
  : path.join(root, 'reports', 'source-deep-probe-report.json');

const generatedAt = new Date().toISOString();

function safeReadJson(filePath, fallback) {
  return exists(filePath) ? readJson(filePath) : fallback;
}

function deriveRing(source) {
  if (source.fetch_method === 'partnership-api' || source.intake_policy === 'partnership-needed') return 'partnership';
  if (source.intake_policy === 'candidate-only' || ['aggregator', 'community'].includes(source.trust_level)) return 'discovery-only';
  if (source.candidate_gate === 'source-evidence') return 'evidence-monitor';
  if (source.candidate_gate === 'duplicate-review') return 'venue-dedupe';
  if (['extraction', 'human-review'].includes(source.candidate_gate)) return 'extractor-backlog';
  return 'watchlist';
}

function sourceBoundary(source, ring) {
  if (ring === 'partnership') return 'partnership_or_api_only';
  if (ring === 'discovery-only') return 'discovery_signal_only';
  if (ring === 'evidence-monitor') return 'evidence_monitor_only';
  if (ring === 'venue-dedupe') return 'dedupe_anchor_only';
  if (ring === 'active-collector') return 'raw_harvest_to_candidate_queue';
  return 'probe_before_collector';
}

function isAutoPublishEligibleSource(source, ring) {
  if (ring !== 'active-collector') return false;
  if (source.intake_policy === 'candidate-only' || source.intake_policy === 'partnership-needed') return false;
  if (['source-evidence', 'extraction', 'duplicate-review', 'blocked'].includes(source.candidate_gate)) return false;
  return ['official', 'venue-official'].includes(source.trust_level);
}

function runStatus({ ring, collection, probe }) {
  if (collection?.status === 'error') return 'collector-error';
  if (probe?.signals?.blocked_reason) return 'probe-blocked';
  if (collection?.status === 'ok' && Number(collection.extracted || 0) > 0) return 'productive';
  if (collection?.status === 'ok') return 'zero-yield';
  if (ring === 'partnership') return 'partnership';
  if (ring === 'discovery-only') return 'discovery-only';
  if (ring === 'evidence-monitor') return 'evidence-monitor';
  if (ring === 'venue-dedupe') return 'venue-dedupe';
  return 'not-attempted';
}

function nextAction({ source, ring, status, zeroYieldStreak, planRow, yieldRow, collection, probe }) {
  if (status === 'collector-error') return `Fix collector error: ${collection.note || 'unknown error'}`;
  if (status === 'probe-blocked') return `Do not bypass protection; keep as blocked/partnership candidate: ${probe.signals.blocked_reason}`;
  if (status === 'productive') return 'Continue periodic collection; dedupe and auto-publish only through the candidate gate.';
  if (status === 'zero-yield' && zeroYieldStreak >= 3) {
    return `Zero-yield for ${zeroYieldStreak} runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only.`;
  }
  if (status === 'zero-yield') return yieldRow?.zero_yield_reason || collection.note || 'No future date-complete rows this run; keep monitoring.';
  if (ring === 'partnership') return 'Partnership/API lane; do not scrape protected or app-only data.';
  if (ring === 'discovery-only') return 'Use only as discovery evidence; never publish directly.';
  if (ring === 'evidence-monitor') return 'Monitor for official event detail evidence before candidate promotion.';
  if (ring === 'venue-dedupe') return 'Use as dedupe/evidence anchor against organizer and official sources.';
  return planRow?.next_action || `Probe ${source.id} before adding or changing an extractor.`;
}

function renderMarkdown(state) {
  const rows = state.sources;
  const stalled = rows
    .filter((row) => row.zero_yield_streak >= 3 || row.status === 'collector-error' || row.status === 'probe-blocked')
    .sort((a, b) => {
      const rank = { 'collector-error': 0, 'probe-blocked': 1, 'zero-yield': 2 };
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || b.zero_yield_streak - a.zero_yield_streak || a.priority - b.priority;
    })
    .slice(0, 20);
  const lines = [
    '# EventLive Source Run State',
    '',
    `Generated at: ${state.generated_at}`,
    '',
    '## Operating Rule',
    '',
    state.operating_rule,
    '',
    '## Totals',
    '',
    `- Sources: ${state.totals.sources}`,
    `- Attempted this run: ${state.totals.attempted}`,
    `- Productive: ${state.totals.productive}`,
    `- Zero-yield: ${state.totals.zero_yield}`,
    `- Collector errors: ${state.totals.collector_errors}`,
    `- Probe blocked: ${state.totals.probe_blocked}`,
    `- Auto-publish eligible source lanes: ${state.totals.auto_publish_eligible_sources}`,
    '',
    '## Stalled / Blocked Focus',
    '',
    '| Source | Status | Zero streak | Boundary | Next action |',
    '|---|---|---:|---|---|',
    ...stalled.map((row) => `| ${row.id} | ${row.status} | ${row.zero_yield_streak} | ${row.source_boundary} | ${row.next_action} |`),
    '',
    '## Full Source State',
    '',
    '| Priority | Source | Ring | Status | Extracted | Auto-publish lane | Next action |',
    '|---:|---|---|---|---:|---|---|',
    ...rows.map((row) => `| ${row.priority} | ${row.id} | ${row.ring} | ${row.status} | ${row.last_extracted} | ${row.auto_publish_eligible_by_source ? 'yes' : 'no'} | ${row.next_action} |`),
    ''
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const registry = safeReadJson(registryPath, { sources: [] });
  const previous = safeReadJson(statePath, { sources: [] });
  const collection = safeReadJson(collectionReportPath, { sources: [], collected_at: null });
  const yieldReport = safeReadJson(yieldReportPath, { sources: [], generated_at: null });
  const plan = safeReadJson(planPath, { sources: [] });
  const probe = safeReadJson(probeReportPath, { sources: [] });

  const previousById = new Map((previous.sources || []).map((row) => [row.id, row]));
  const collectionById = new Map((collection.sources || []).map((row) => [row.id, row]));
  const yieldById = new Map((yieldReport.sources || []).map((row) => [row.id, row]));
  const planById = new Map((plan.sources || []).map((row) => [row.id, row]));
  const probeById = new Map((probe.sources || []).map((row) => [row.id, row]));

  const sources = (registry.sources || [])
    .map((source) => {
      const planRow = planById.get(source.id) || {};
      const ring = planRow.ring || deriveRing(source);
      const collectionRow = collectionById.get(source.id) || null;
      const yieldRow = yieldById.get(source.id) || null;
      const probeRow = probeById.get(source.id) || null;
      const status = runStatus({ ring, collection: collectionRow, probe: probeRow });
      const previousRow = previousById.get(source.id) || {};
      const zeroYieldStreak = status === 'zero-yield' ? Number(previousRow.zero_yield_streak || 0) + 1 : 0;
      const errorStreak = status === 'collector-error' ? Number(previousRow.error_streak || 0) + 1 : 0;
      const boundary = sourceBoundary(source, ring);

      return {
        id: source.id,
        name: source.name,
        owner: source.owner,
        url: source.url,
        priority: source.priority,
        source_type: source.source_type,
        trust_level: source.trust_level,
        intake_policy: source.intake_policy,
        candidate_gate: source.candidate_gate,
        fetch_method: source.fetch_method,
        ring,
        cadence: planRow.cadence || '',
        source_boundary: boundary,
        status,
        last_attempted_at: collectionRow ? collection.collected_at : null,
        last_yield_checked_at: yieldRow ? yieldReport.generated_at : null,
        last_probe_at: probeRow ? probe.generated_at : null,
        last_collection_status: collectionRow?.status || '',
        last_extracted: Number(collectionRow?.extracted || 0),
        last_snapshot_path: collectionRow?.snapshot_path || yieldRow?.snapshot_path || '',
        last_zero_yield_reason: yieldRow?.zero_yield_reason || collectionRow?.note || '',
        dropped_samples_count: Array.isArray(yieldRow?.dropped_samples) ? yieldRow.dropped_samples.length : 0,
        zero_yield_streak: zeroYieldStreak,
        error_streak: errorStreak,
        auto_publish_eligible_by_source: isAutoPublishEligibleSource(source, ring),
        auto_publish_guard: isAutoPublishEligibleSource(source, ring)
          ? 'candidate must still pass evidence, duplicate, date, and confidence gates'
          : 'not a direct auto-publish source lane',
        next_action: nextAction({ source, ring, status, zeroYieldStreak, planRow, yieldRow, collection: collectionRow, probe: probeRow })
      };
    })
    .sort((a, b) => a.priority - b.priority);

  const totals = {
    sources: sources.length,
    attempted: sources.filter((source) => source.last_attempted_at).length,
    productive: sources.filter((source) => source.status === 'productive').length,
    zero_yield: sources.filter((source) => source.status === 'zero-yield').length,
    collector_errors: sources.filter((source) => source.status === 'collector-error').length,
    probe_blocked: sources.filter((source) => source.status === 'probe-blocked').length,
    discovery_only: sources.filter((source) => source.ring === 'discovery-only').length,
    partnership: sources.filter((source) => source.ring === 'partnership').length,
    auto_publish_eligible_sources: sources.filter((source) => source.auto_publish_eligible_by_source).length
  };

  const state = {
    schema: 'eventlive.source-run-state.v1',
    generated_at: generatedAt,
    operating_rule: 'Raw collection is not publication. Every source run preserves evidence, separates discovery from production, and only official/venue active-collector lanes can reach auto-publish after candidate-level guards.',
    inputs: {
      registry: rel(registryPath),
      collection_report: exists(collectionReportPath) ? rel(collectionReportPath) : null,
      yield_report: exists(yieldReportPath) ? rel(yieldReportPath) : null,
      ingestion_plan: exists(planPath) ? rel(planPath) : null,
      probe_report: exists(probeReportPath) ? rel(probeReportPath) : null
    },
    totals,
    sources
  };

  writeJson(statePath, state);
  writeJson(reportJsonPath, state);
  ensureDir(path.dirname(reportMdPath));
  fs.writeFileSync(reportMdPath, renderMarkdown(state), 'utf8');

  console.log('# EventLive Source Run State');
  console.log(`- Sources: ${totals.sources}`);
  console.log(`- Attempted: ${totals.attempted}`);
  console.log(`- Productive: ${totals.productive}`);
  console.log(`- Zero-yield: ${totals.zero_yield}`);
  console.log(`- Auto-publish eligible source lanes: ${totals.auto_publish_eligible_sources}`);
  console.log(`- State: ${rel(statePath)}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main();
