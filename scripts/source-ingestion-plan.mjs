import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const registryPath = path.join(root, 'data', 'source_registry.json');
const collectionReportPath = path.join(root, 'reports', 'source-collection-report.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const deepProbeReportPath = path.join(root, 'reports', 'source-deep-probe-report.json');
const reportJsonPath = path.join(root, 'reports', 'source-ingestion-plan.json');
const reportMdPath = path.join(root, 'reports', 'source-ingestion-plan.md');
const generatedAt = new Date().toISOString();

const activeCollectorIds = new Set([
  'visit-saudi-calendar',
  'visit-saudi-seasons',
  'experience-alula-events',
  'ithra-events',
  'monshaat-events',
  'rfecc-whats-on',
  'dhahran-expo-calendar',
  'mdlbeast-events',
  'saudi-water-authority-events',
  'tuwaiq-academy-bootcamps',
  'future-skills-catalog',
  'code-mcit-programs',
  'misk-hub-programs',
  'misk-hub-events',
  'discover-aseer-events',
  'sdaia-academy-programs',
  'saudi-pro-league-fixtures',
  'moc-cultural-calendar',
  'moc-cultural-subportals',
  'mos-events',
  'jcci-events-center',
  'umm-al-qura-events',
  'madinah-chamber-events',
  'madinah-architecture-festival',
  'hayy-jameel-events',
  'sdaia-calendar-events',
  'asharqia-chamber-events',
  'makkah-chamber-events',
  'qassim-chamber-events',
  'abha-chamber-events',
  'jazan-chamber-events',
  'invest-saudi-events',
  'saudi-space-agency-events',
  'sfda-events'
]);

const nextExtractorFocus = new Set([
  'misk-hub-events',
  'riyadh-city-events',
  'sdaia-calendar-events',
  'gea-entertainment-events',
  'moc-cultural-calendar',
  'moc-cultural-subportals',
  'jcci-events-center'
]);

function safeReadJson(filePath, fallback) {
  return exists(filePath) ? readJson(filePath) : fallback;
}

function collectionBySource() {
  const report = safeReadJson(collectionReportPath, { sources: [] });
  return new Map((report.sources || []).map((source) => [source.id, source]));
}

function deepProbeBySource() {
  const report = safeReadJson(deepProbeReportPath, { sources: [] });
  return new Map((report.sources || []).map((source) => [source.id, source]));
}

function candidatesBySourceName(candidates) {
  const counts = new Map();
  for (const candidate of candidates) {
    const key = candidate.source_label || candidate.source_owner || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function isOfficial(source) {
  return source.trust_level === 'official' || source.trust_level === 'venue-official';
}

function isDiscoveryOnly(source) {
  return source.intake_policy === 'candidate-only'
    || source.trust_level === 'aggregator'
    || source.trust_level === 'community'
    || source.source_type === 'industry-directory'
    || source.source_type === 'community-platform';
}

function planRing(source) {
  if (activeCollectorIds.has(source.id)) return 'active-collector';
  if (source.fetch_method === 'partnership-api' || source.intake_policy === 'partnership-needed') return 'partnership';
  if (isDiscoveryOnly(source)) return 'discovery-only';
  if (source.candidate_gate === 'source-evidence') return 'evidence-monitor';
  if (source.candidate_gate === 'duplicate-review') return 'venue-dedupe';
  if (source.candidate_gate === 'extraction' || source.candidate_gate === 'human-review') return 'extractor-backlog';
  return 'watchlist';
}

function cadenceFor(source, ring) {
  if (ring === 'active-collector') return 'daily';
  if (ring === 'partnership') return 'monthly-partnership-check';
  if (ring === 'discovery-only') return source.priority <= 20 ? 'weekly-discovery' : 'monthly-discovery';
  if (ring === 'evidence-monitor') return source.priority <= 35 ? 'weekly-evidence-check' : 'monthly-evidence-check';
  if (ring === 'venue-dedupe') return source.priority <= 30 ? 'twice-weekly-dedupe-check' : 'weekly-dedupe-check';
  if (ring === 'extractor-backlog') return source.priority <= 25 ? 'daily-extractor-probe' : 'twice-weekly-extractor-probe';
  return 'monthly-watch';
}

function sourceScore(source, ring, probe) {
  let score = Math.max(1, 80 - Number(source.priority || 99));
  if (ring === 'active-collector') score += 40;
  if (ring === 'extractor-backlog') score += 25;
  if (ring === 'venue-dedupe') score += 12;
  if (nextExtractorFocus.has(source.id)) score += 45;
  if (source.intake_policy === 'official-feed-preferred') score += 12;
  if (isOfficial(source)) score += 10;
  if (probe?.recommendation?.startsWith('build-')) score += 20;
  if (probe?.recommendation?.startsWith('probe-hidden-api')) score += 10;
  if (probe?.recommendation?.startsWith('blocked-or-protected')) score -= 30;
  if (Number.isFinite(Number(probe?.extraction_score))) score += Math.min(20, Math.max(0, Math.round(Number(probe.extraction_score) / 5)));
  if (ring === 'evidence-monitor') score -= 8;
  if (ring === 'partnership') score -= 16;
  if (ring === 'discovery-only') score -= 22;
  return score;
}

function nextAction(source, ring, probe, collection = {}) {
  if (ring === 'active-collector') {
    const collected = Number(collection.extracted || 0) + Number(collection.ended_extracted || 0);
    if (collection.status === 'ok' && collected > 0) {
      return 'Run in the 6-hour sync ring; keep dedupe and image enrichment active.';
    }
    return probe?.recommendation
      ? `Run in the 6-hour sync ring; latest probe says ${probe.recommendation}.`
      : 'Run in the 6-hour sync ring; improve zero-yield extractors before widening.';
  }
  if (probe?.recommendation?.startsWith('blocked-or-protected')) {
    return `Do not scrape now; latest probe is ${probe.recommendation}. Keep as partnership, browser/API investigation, or evidence lane.`;
  }
  if (probe?.recommendation?.startsWith('build-') || probe?.recommendation?.startsWith('probe-hidden-api')) {
    return `Latest deep probe recommends ${probe.recommendation}; build only if future date-complete rows are visible.`;
  }
  if (ring === 'extractor-backlog') {
    return nextExtractorFocus.has(source.id)
      ? 'Build the next conservative extractor and publish only date-complete candidates.'
      : 'Probe HTML/API shape, then decide whether an extractor is worth adding.';
  }
  if (ring === 'venue-dedupe') {
    return 'Use as a discovery anchor, then reconcile against organizer, ticketing, and catalog duplicates.';
  }
  if (ring === 'evidence-monitor') {
    return 'Monitor for live event/detail pages; do not create public rows from summary or coming-soon pages.';
  }
  if (ring === 'partnership') {
    return 'Open a relationship/API path; keep out of automated scraping until a feed or permission path exists.';
  }
  if (ring === 'discovery-only') {
    return 'Use only to discover leads; require official confirmation before promotion.';
  }
  return 'Keep registered and revisit when source structure changes.';
}

function summarize(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function renderMarkdown(plan) {
  const lines = [
    '# EventLive Source Ingestion Plan',
    '',
    `Generated at: ${plan.generated_at}`,
    '',
    '## Executive Model',
    '',
    'EventLive should not treat all registered sources equally. The operating model is six rings: active collectors, extractor backlog, venue/dedupe checks, evidence monitors, partnership lanes, and discovery-only lanes.',
    '',
    '## Totals',
    '',
    `- Sources: ${plan.totals.sources}`,
    `- Active collectors: ${plan.totals.active_collectors}`,
    `- Extractor backlog: ${plan.totals.extractor_backlog}`,
    `- Evidence monitors: ${plan.totals.evidence_monitor}`,
    `- Partnership/API lanes: ${plan.totals.partnership}`,
    `- Discovery-only lanes: ${plan.totals.discovery_only}`,
    `- Sources with latest deep-probe evidence: ${plan.totals.deep_probe_sources}`,
    '',
    '## Run Cadence',
    '',
    '| Cadence | Sources | Purpose |',
    '|---|---:|---|',
    ...Object.entries(plan.cadence_counts).map(([cadence, count]) => `| ${cadence} | ${count} | ${cadencePurpose(cadence)} |`),
    '',
    '## Next Extractor Build Queue',
    '',
    '| Rank | Source | Ring | Cadence | Probe | Why |',
    '|---:|---|---|---|---|---|',
    ...plan.next_extractors.map((item, index) => `| ${index + 1} | ${item.id} | ${item.ring} | ${item.cadence} | ${item.last_probe_recommendation || '-'} | ${item.next_action} |`),
    '',
    '## Active 6-Hour Ring',
    '',
    '| Source | Last status | Extracted | Probe | Next action |',
    '|---|---|---:|---|---|',
    ...plan.sources
      .filter((source) => source.ring === 'active-collector')
      .map((source) => `| ${source.id} | ${source.last_collection_status || '-'} | ${source.last_extracted} | ${source.last_probe_recommendation || '-'} | ${source.next_action} |`),
    '',
    '## Full Source Plan',
    '',
    '| Priority | Source | Ring | Cadence | Score | Probe | Next action |',
    '|---:|---|---|---|---:|---|---|',
    ...plan.sources.map((source) => `| ${source.priority} | ${source.id} | ${source.ring} | ${source.cadence} | ${source.score} | ${source.last_probe_recommendation || '-'} | ${source.next_action} |`),
    ''
  ];
  return `${lines.join('\n')}\n`;
}

function cadencePurpose(cadence) {
  if (cadence === 'daily') return 'Collect candidates and let trust gates decide publication.';
  if (cadence === 'daily-extractor-probe') return 'High-priority official source that needs an extractor.';
  if (cadence === 'twice-weekly-extractor-probe') return 'Official or strategic source to test before extractor build.';
  if (cadence === 'twice-weekly-dedupe-check' || cadence === 'weekly-dedupe-check') return 'Venue or directory source requiring duplicate control.';
  if (cadence === 'weekly-evidence-check' || cadence === 'monthly-evidence-check') return 'Evidence-only source waiting for complete event pages.';
  if (cadence === 'monthly-partnership-check') return 'Relationship/API path, not scraping.';
  if (cadence === 'weekly-discovery' || cadence === 'monthly-discovery') return 'Lead discovery only, never direct publication.';
  return 'Watch for source changes.';
}

function main() {
  const registry = readJson(registryPath);
  const sources = [...(registry.sources || [])].sort((a, b) => a.priority - b.priority);
  const collection = collectionBySource();
  const probeResults = deepProbeBySource();
  const candidateEnvelope = safeReadJson(candidatesPath, { candidates: [] });
  const candidateCounts = candidatesBySourceName(candidateEnvelope.candidates || []);

  const plannedSources = sources.map((source) => {
    const ring = planRing(source);
    const cadence = cadenceFor(source, ring);
    const lastCollection = collection.get(source.id) || {};
    const probe = probeResults.get(source.id) || {};
    return {
      id: source.id,
      name: source.name,
      priority: source.priority,
      url: source.url,
      trust_level: source.trust_level,
      source_type: source.source_type,
      intake_policy: source.intake_policy,
      candidate_gate: source.candidate_gate,
      fetch_method: source.fetch_method,
      ring,
      cadence,
      score: sourceScore(source, ring, probe),
      has_active_collector: activeCollectorIds.has(source.id),
      last_collection_status: lastCollection.status || '',
      last_extracted: Number(lastCollection.extracted || 0),
      last_probe_status: probe.signals?.status || '',
      last_probe_score: Number(probe.extraction_score || 0),
      last_probe_recommendation: probe.recommendation || '',
      last_probe_blocked_reason: probe.signals?.blocked_reason || '',
      known_candidates: candidateCounts.get(source.name) || 0,
      next_action: nextAction(source, ring, probe, lastCollection)
    };
  });

  const totals = {
    sources: plannedSources.length,
    active_collectors: plannedSources.filter((source) => source.ring === 'active-collector').length,
    extractor_backlog: plannedSources.filter((source) => source.ring === 'extractor-backlog').length,
    evidence_monitor: plannedSources.filter((source) => source.ring === 'evidence-monitor').length,
    partnership: plannedSources.filter((source) => source.ring === 'partnership').length,
    discovery_only: plannedSources.filter((source) => source.ring === 'discovery-only').length,
    deep_probe_sources: plannedSources.filter((source) => source.last_probe_recommendation).length
  };

  const report = {
    generated_at: generatedAt,
    source_registry: rel(registryPath),
    source_collection_report: exists(collectionReportPath) ? rel(collectionReportPath) : '',
    totals,
    ring_counts: summarize(plannedSources, 'ring'),
    cadence_counts: summarize(plannedSources, 'cadence'),
    next_extractors: plannedSources
      .filter((source) => ['extractor-backlog', 'venue-dedupe'].includes(source.ring))
      .sort((a, b) => b.score - a.score || a.priority - b.priority)
      .slice(0, 12),
    sources: plannedSources
  };

  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, renderMarkdown(report), 'utf8');

  console.log('# EventLive Source Ingestion Plan');
  console.log(`- Sources: ${report.totals.sources}`);
  console.log(`- Active collectors: ${report.totals.active_collectors}`);
  console.log(`- Next extractors: ${report.next_extractors.slice(0, 5).map((item) => item.id).join(', ')}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main();
