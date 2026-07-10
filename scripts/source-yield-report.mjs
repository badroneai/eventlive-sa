import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

process.env.EVENTLIVE_SOURCE_FETCH_TIMEOUT_MS ||= '9000';
process.env.EVENTLIVE_SOURCE_FETCH_ATTEMPTS ||= '1';

let isPastCandidate;
let loadSourceExtraction;
let sourceExtractors = {};

const registryPath = path.join(root, 'data', 'source_registry.json');
const collectionReportPath = path.join(root, 'reports', 'source-collection-report.json');
const attemptsPath = path.join(root, 'reports', 'source-yield-attempts.json');
const reportJsonPath = path.join(root, 'reports', 'source-yield-report.json');
const reportMdPath = path.join(root, 'reports', 'source-yield-report.md');
const snapshotDir = path.join(root, 'data', 'raw', 'source-yield-snapshots');
const selectedIds = (process.env.EVENTLIVE_SOURCE_IDS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const maxRows = Math.max(1, Number(process.env.EVENTLIVE_SOURCE_LIMIT || 40));
const now = new Date();

function snapshotExtensionFor(source) {
  const target = source.collector_url || source.url || '';
  return /\/api\/|api\.|\.json(?:$|\?)/i.test(target) ? 'json' : 'html';
}

function countSignals(payload) {
  const text = String(payload || '');
  let jsonRows = 0;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed?.response?.data)) jsonRows = parsed.response.data.length;
    else if (Array.isArray(parsed?.content)) jsonRows = parsed.content.length;
    else if (Array.isArray(parsed?.data)) jsonRows = parsed.data.length;
    else if (Array.isArray(parsed)) jsonRows = parsed.length;
  } catch {
    jsonRows = 0;
  }
  return {
    bytes: Buffer.byteLength(text),
    json_rows: jsonRows,
    links: (text.match(/<a\b/gi) || []).length,
    json_ld_blocks: (text.match(/application\/ld\+json/gi) || []).length,
    next_data_blocks: (text.match(/__NEXT_DATA__/gi) || []).length,
    date_like_tokens: (text.match(/\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}\s+[A-Za-z]{3,9}\s+20\d{2}\b|يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر/gi) || []).length
  };
}

function itemDropReason(item) {
  if (!item?.title) return 'missing-title';
  if (!item?.url) return 'missing-url';
  if (!item?.starts_at || !item?.ends_at) return 'missing-date';
  if (isPastCandidate(item)) return 'past-date';
  return '';
}

function rawDateTextFor(item) {
  return [
    item?.raw_date_text,
    item?.date_text,
    item?.dateText,
    item?.source_date_text,
    item?.source_date,
    item?.display_date,
    item?.date
  ].find((value) => String(value || '').trim()) || '';
}

function convertedDateFor(item) {
  return [item?.starts_at, item?.ends_at].filter(Boolean).join(' - ');
}

function summarizeReasons(items) {
  const reasons = {};
  for (const item of items) {
    const reason = itemDropReason(item) || 'future-complete';
    reasons[reason] = (reasons[reason] || 0) + 1;
  }
  return reasons;
}

function summarizeDroppedSamples(items, limit = 5) {
  return items
    .map((item) => ({
      title: item?.title || '',
      reason: itemDropReason(item),
      raw_date_text: rawDateTextFor(item),
      converted_date: convertedDateFor(item),
      city: item?.city || '',
      url: item?.url || ''
    }))
    .filter((sample) => sample.reason)
    .slice(0, limit);
}

function readPreviousCollection() {
  if (!fs.existsSync(collectionReportPath)) return new Map();
  const report = readJson(collectionReportPath);
  return new Map((report.sources || []).map((source) => [source.id, source]));
}

function renderMarkdown(report) {
  const lines = [
    '# EventLive Source Yield Report',
    '',
    `Generated at: ${report.generated_at}`,
    `Sources attempted: ${report.sources_attempted}`,
    '',
    '| Source | Status | Signals | Extracted raw | Future complete | Written last run | Drop reasons | Note |',
    '|---|---|---:|---:|---:|---:|---|---|',
    ...report.sources.map((source) => {
      const signals = `bytes ${source.signals.bytes}, rows ${source.signals.json_rows}, dates ${source.signals.date_like_tokens}`;
      const reasons = Object.entries(source.drop_reasons).map(([key, value]) => `${key}:${value}`).join(', ') || '-';
      return `| ${source.id} | ${source.status} | ${signals} | ${source.extracted_raw} | ${source.future_complete} | ${source.last_written} | ${reasons} | ${source.note || ''} |`;
    }),
    '',
    '## Zero Yield Sources',
    '',
    '| Source | Diagnosis | Attempts |',
    '|---|---|---|',
    ...report.sources
      .filter((source) => source.future_complete === 0)
      .map((source) => `| ${source.id} | ${source.zero_yield_reason || 'No future complete rows returned by extractor'} | ${source.attempts_documented || 0} |`),
    '',
    '## Dropped Row Samples',
    '',
    '| Source | Title | Reason | Raw date text | Converted date | City |',
    '|---|---|---|---|---|---|',
    ...report.sources.flatMap((source) => (source.dropped_samples || []).map((sample) => {
      const clean = (value) => String(value || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
      return `| ${source.id} | ${clean(sample.title)} | ${clean(sample.reason)} | ${clean(sample.raw_date_text) || '-'} | ${clean(sample.converted_date) || '-'} | ${clean(sample.city) || '-'} |`;
    })),
    ''
  ];
  return `${lines.join('\n')}\n`;
}

async function main() {
  ({ isPastCandidate, loadSourceExtraction, sourceExtractors } = await import('./collect-source-candidates.mjs'));
  ensureDir(snapshotDir);
  const registry = readJson(registryPath);
  const attempts = fs.existsSync(attemptsPath) ? readJson(attemptsPath) : {};
  const allSources = [...(registry.sources || [])].sort((a, b) => a.priority - b.priority);
  const runnableSources = allSources.filter((source) => sourceExtractors[source.id]);
  const sources = selectedIds.length
    ? runnableSources.filter((source) => selectedIds.includes(source.id))
    : runnableSources;
  const lastCollection = readPreviousCollection();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const rows = [];

  for (const source of sources) {
    const extractor = sourceExtractors[source.id];
    const row = {
      id: source.id,
      name: source.name,
      url: source.url,
      collector_url: source.collector_url || '',
      status: 'skipped',
      snapshot_path: '',
      signals: { bytes: 0, json_rows: 0, links: 0, json_ld_blocks: 0, next_data_blocks: 0, date_like_tokens: 0 },
      extracted_raw: 0,
      future_complete: 0,
      capped_future_complete: 0,
      last_written: Number(lastCollection.get(source.id)?.extracted || 0),
      drop_reasons: {},
      dropped_samples: [],
      sample_titles: [],
      zero_yield_reason: '',
      attempts_documented: Array.isArray(attempts[source.id]) ? attempts[source.id].length : 0,
      attempt_notes: Array.isArray(attempts[source.id]) ? attempts[source.id] : [],
      note: ''
    };
    try {
      const extraction = await loadSourceExtraction(source, extractor);
      const payload = extraction.payload;
      if (payload) {
        const snapshotPath = path.join(snapshotDir, `${source.id}-${stamp}.${snapshotExtensionFor(source)}`);
        fs.writeFileSync(snapshotPath, payload, 'utf8');
        row.snapshot_path = rel(snapshotPath);
      }
      row.signals = countSignals(payload);
      const extracted = extraction.items;
      row.extracted_raw = extracted.length;
      row.drop_reasons = summarizeReasons(extracted);
      row.dropped_samples = summarizeDroppedSamples(extracted);
      const future = extracted.filter((item) => !itemDropReason(item));
      row.future_complete = future.length;
      row.capped_future_complete = future.slice(0, maxRows).length;
      row.sample_titles = future.slice(0, 5).map((item) => item.title);
      row.status = 'ok';
      if (extraction.primary_error) {
        row.note = `Recovered through official API after primary page failure: ${extraction.primary_error.message}`;
      }
      if (!future.length) {
        if (!extracted.length && row.signals.date_like_tokens > 0) row.zero_yield_reason = 'date/content signals exist but extractor returned no complete future rows';
        else if (!extracted.length && row.signals.json_rows > 0) row.zero_yield_reason = 'JSON rows exist but extractor mapping returned zero';
        else if (!extracted.length) row.zero_yield_reason = 'no rows detected by extractor';
        else row.zero_yield_reason = Object.entries(row.drop_reasons).map(([key, value]) => `${key}:${value}`).join(', ');
      }
    } catch (error) {
      row.status = 'error';
      row.note = error.message;
      row.zero_yield_reason = `collector-error: ${error.message}`;
    }
    rows.push(row);
  }

  const productive = rows.filter((row) => row.future_complete > 0).length;
  const report = {
    generated_at: now.toISOString(),
    sources_attempted: rows.length,
    productive_sources: productive,
    zero_yield_sources: rows.length - productive,
    sources: rows
  };
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, renderMarkdown(report), 'utf8');
  console.log('# EventLive Source Yield');
  console.log(`- Sources attempted: ${report.sources_attempted}`);
  console.log(`- Productive sources: ${report.productive_sources}`);
  console.log(`- Zero-yield sources: ${report.zero_yield_sources}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main().catch((error) => {
  console.error(`SOURCE_YIELD_FAILED ${error.message}`);
  process.exit(1);
});
