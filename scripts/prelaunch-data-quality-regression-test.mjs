import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getEventStatus } from './event-kind-utils.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const reportsDir = path.join(root, 'reports');
const eventsPath = path.join(distDir, 'events.json');
const reportJsonPath = path.join(reportsDir, 'prelaunch-data-quality-report.json');
const reportMdPath = path.join(reportsDir, 'prelaunch-data-quality-report.md');

assert.ok(fs.existsSync(eventsPath), 'dist/events.json must exist; run npm run build first');

const envelope = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const events = Array.isArray(envelope.events) ? envelope.events : [];
const generatedAt = Date.parse(envelope.generated_at || new Date().toISOString());
const hasArabic = /[\u0600-\u06ff]/;
const sportsSignal = /رياض|بطول|مبار|لياق|ماراثون|كأس|دوري|sport|sports|football|match|cup|fifa|fan zone|formula|pfl|marathon|fitness/i;

function walkFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function htmlMetaDescription(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '';
  return {
    page: path.relative(distDir, filePath),
    description,
    length: description.length
  };
}

function publicArtifactDraftReference(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const badPattern = /كتالوج EventLive التجريبي|sample-record|needs-source-evidence|needs-organizer-confirmation|riyadh-govtech-forum-2026|jeddah-creative-week-2026|dammam-startup-evening-2026/;
  return badPattern.test(text)
    ? { page: path.relative(distDir, filePath), description: 'draft/sample marker leaked into public artifact', length: 0 }
    : null;
}

function isAllowedMissingSource(event) {
  const label = String(event.source_label || '');
  const confidence = String(event.source_confidence || '');
  return /EventLive التجريبي/.test(label) && /sample-record|needs-source-evidence|needs-organizer-confirmation/.test(confidence);
}

function isDraftLikePublicRecord(event) {
  const label = String(event.source_label || '');
  const confidence = String(event.source_confidence || '');
  return /EventLive التجريبي/.test(label) || /sample-record|needs-source-evidence|needs-organizer-confirmation/.test(confidence);
}

function expectedStatus(event) {
  if (event.catalog_group === 'ended' || String(event.id || '').startsWith('ended-')) return 'ended';
  return getEventStatus(event.starts_at, event.ends_at, generatedAt, event.event_kind).key;
}

const checks = {
  total_events: events.length,
  bad_category_labels: events.filter((event) => !hasArabic.test(event.category_label || '')),
  bad_city_labels: events.filter((event) => !hasArabic.test(event.city_label || '')),
  external_images: events.filter((event) => /^https?:\/\//i.test(event.image_url || '')),
  missing_or_short_summaries: events.filter((event) => !event.summary || event.summary.length < 30),
  weak_upcoming_summaries: events.filter((event) => event.status !== 'ended' && (!event.summary || event.summary.length < 100)),
  draft_like_public_records: events.filter(isDraftLikePublicRecord),
  missing_unexplained_sources: events.filter((event) => !(event.source_url || event.evidence_url) && !isAllowedMissingSource(event)),
  misleading_sports_audience: events.filter((event) => (event.audiences || []).includes('sports') && !sportsSignal.test([
    event.title,
    event.summary,
    event.category,
    event.category_label,
    Array.isArray(event.tags) ? event.tags.join(' ') : ''
  ].filter(Boolean).join(' '))),
  status_mismatches: events.filter((event) => event.status !== expectedStatus(event)),
  weak_meta_descriptions: walkFiles(distDir)
    .filter((filePath) => filePath.endsWith('.html'))
    .map(htmlMetaDescription)
    .filter((page) => page.length < 80),
  draft_like_public_artifact_refs: walkFiles(distDir)
    .filter((filePath) => /\.(html|json|xml|js|css|webmanifest|txt)$/.test(filePath))
    .map(publicArtifactDraftReference)
    .filter(Boolean)
};

function failureItem(item) {
  if (item.page) return item;
  return {
    id: item.id,
    title: item.title,
    city_label: item.city_label,
    category_label: item.category_label,
    status: item.status,
    expected_status: expectedStatus(item),
    source_label: item.source_label
  };
};

const failures = Object.fromEntries(
  Object.entries(checks)
    .filter(([, value]) => Array.isArray(value) && value.length)
    .map(([key, value]) => [key, value.map(failureItem)])
);

const report = {
  generated_at: new Date().toISOString(),
  intent: 'eventlive-prelaunch-data-quality',
  ok: Object.keys(failures).length === 0,
  totals: {
    events: events.length,
    upcoming_or_active: events.filter((event) => event.status !== 'ended').length,
    ended: events.filter((event) => event.status === 'ended').length,
    live_ready: events.filter((event) => event.live_schedule_ready).length,
    cities: new Set(events.map((event) => event.city)).size,
    categories: new Set(events.map((event) => event.category_slug)).size,
    local_images: events.filter((event) => String(event.image_url || '').startsWith('/assets/')).length
  },
  failure_counts: Object.fromEntries(Object.entries(failures).map(([key, value]) => [key, value.length])),
  failures
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(reportMdPath, [
  '# EventLive Prelaunch Data Quality',
  '',
  `- Generated at: ${report.generated_at}`,
  `- Status: ${report.ok ? 'PASS' : 'FAIL'}`,
  `- Events: ${report.totals.events}`,
  `- Upcoming/active: ${report.totals.upcoming_or_active}`,
  `- Ended: ${report.totals.ended}`,
  `- Live-ready: ${report.totals.live_ready}`,
  `- Cities: ${report.totals.cities}`,
  `- Categories: ${report.totals.categories}`,
  `- Local images: ${report.totals.local_images}`,
  '',
  '| Check | Failures |',
  '|---|---:|',
  ...['bad_category_labels', 'bad_city_labels', 'external_images', 'missing_or_short_summaries', 'weak_upcoming_summaries', 'draft_like_public_records', 'draft_like_public_artifact_refs', 'missing_unexplained_sources', 'misleading_sports_audience', 'status_mismatches', 'weak_meta_descriptions']
    .map((key) => `| ${key} | ${report.failure_counts[key] || 0} |`),
  ''
].join('\n'), 'utf8');

assert.ok(events.length >= 100, 'prelaunch catalog should remain meaningfully populated');
assert.deepEqual(failures, {}, `prelaunch data quality failures: ${JSON.stringify(report.failure_counts)}`);

console.log(`prelaunch-data-quality-regression-test: ok events=${events.length} cities=${report.totals.cities} categories=${report.totals.categories}`);
