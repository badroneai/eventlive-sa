import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = process.env.EVENTLIVE_EVENTS_CATALOG_FILE
  ? path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE)
  : path.join(root, 'data', 'events_catalog.json');
const distEventsPath = process.env.EVENTLIVE_PUBLIC_EVENTS_FILE
  ? path.join(root, process.env.EVENTLIVE_PUBLIC_EVENTS_FILE)
  : path.join(root, 'dist', 'events.json');
const reportPath = process.env.EVENTLIVE_BACKLOG_ENRICHMENT_REPORT
  ? path.join(root, process.env.EVENTLIVE_BACKLOG_ENRICHMENT_REPORT)
  : path.join(root, 'reports', 'official-event-backlog-enrichment-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const published = catalogEvents.filter((event) => event.approval_status === 'published');
const missingOutline = published.filter((event) => !event.program_outline);

assert.equal(missingOutline.length, 0, 'all published catalog events must have program_outline after backlog enrichment');

const requiredSources = [
  'Visit Saudi Seasons',
  "Monsha'at All Events",
  'Saudi Universities and Technical Colleges',
  'Riyadh City Events',
  'Invest Saudi Events',
  'Asharqia Chamber Events',
  'Qassim Chamber Events'
];

for (const source of requiredSources) {
  const sourceEvents = published.filter((event) => event.source_label === source);
  assert.ok(sourceEvents.length > 0, `${source} must exist in catalog`);
  assert.equal(
    sourceEvents.every((event) => event.program_outline?.provider === source),
    true,
    `${source} rows must carry source-scoped program outlines`
  );
}

for (const event of published) {
  assert.ok(event.program_outline.official_description, `${event.id} must include official_description`);
  assert.ok(event.program_outline.features?.length >= 1, `${event.id} must include features`);
  assert.ok(event.program_outline.goals?.length >= 1, `${event.id} must include attendance goals`);
  assert.equal(
    Boolean(event.live_schedule_ready),
    Boolean(Number(event.sessions_count || 0) > 0 && event.live_schedule_ready),
    `${event.id} must not be marked live-ready without sessions`
  );
  assert.doesNotMatch(event.image_url || '', /\.(mp4|mov|webm)(\?|$)/i, `${event.id} must not use video as image`);
  assert.doesNotMatch(event.image_url || '', /(?:whatsapp|social|chat[-_]?icon)/i, `${event.id} must not use a social/contact icon as event artwork`);
  assert.doesNotMatch(event.image_url || '', /(?:safari[-_]?pinned|pinned[-_]?tab|mask[-_]?icon)/i, `${event.id} must not use a browser icon as event artwork`);
}

for (const event of published.filter((row) => requiredSources.includes(row.source_label))) {
  assert.ok(event.program_outline.features?.length >= 4, `${event.id} backlog outline must include rich features`);
  assert.ok(event.program_outline.goals?.length >= 2, `${event.id} backlog outline must include attendance goals`);
  assert.ok(event.program_outline.requirements?.length >= 1, `${event.id} backlog outline must include attendance requirements`);
}

const ithraEvents = published.filter((event) => event.source_label === 'Ithra Events');

assert.equal(
  ithraEvents.every((event) => event.program_outline?.source_method === 'official-public-algolia-index'),
  true,
  'Ithra outlines must retain their official public index provenance'
);
// Class ban for sync 31016172861/31041912300/31069254407: this used to demand the
// literal "official timed sessions" wording on EVERY Ithra row, which silently
// asserted that every Ithra listing must carry a timed agenda. Ithra publishes
// genuine event-level-only entries (e.g. the open-run exhibition
// "Manal Mohei Eldin and Oriental Strokes", sessions_count=0), so one ordinary
// third-party listing turned a code-regression gate red and froze publishing for
// three consecutive scheduled runs. The gate now checks what it actually owns:
// that the status is one of the two sentences scripts/enrich-official-event-backlog-details.mjs
// is allowed to write, so a writer regression (missing field, drifted wording) is
// still caught while third-party programming choices are not treated as defects.
//
// It matches the writer's output SHAPE, not the live sessions_count: the outline
// is a snapshot stamped at collected_at (many Ithra rows still carry their
// 2026-07-10 stamp) while sessions_count keeps moving as past sessions are pruned,
// so `event-water-challenges` legitimately reads 19 live against a "33 official
// timed sessions" snapshot. Asserting equality there would only install a second
// lying gate that reddens on ordinary calendar drift.
const SESSION_STATUS_SHAPES = [
  /^\d+ official timed sessions were extracted from the official source\.$/,
  /^Event-level source only; no timed session agenda was extracted\.$/
];
const describesSessionSchedule = (event) => SESSION_STATUS_SHAPES
  .some((shape) => shape.test(event.program_outline?.faqs?.live_schedule_status || ''));
assert.equal(
  ithraEvents.every(describesSessionSchedule),
  true,
  `Ithra outlines must describe the extracted official session schedule (offenders: ${
    ithraEvents.filter((event) => !describesSessionSchedule(event))
      .slice(0, 5)
      .map((event) => `${event.id} sessions_count=${Number(event.sessions_count || 0)} status="${event.program_outline?.faqs?.live_schedule_status || ''}"`)
      .join('; ')
  })`
);

const normalizeIdentityPart = (value = '') => String(value)
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[\p{P}\p{S}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const publicIdentity = (event) => [
  normalizeIdentityPart(event.title),
  normalizeIdentityPart(event.city),
  event.starts_at || '',
  event.ends_at || '',
  normalizeIdentityPart(event.source_label || event.organizer)
].join('|');
const distById = new Map(distEvents.map((event) => [event.id, event]));
const distByIdentity = new Map(distEvents.map((event) => [publicIdentity(event), event]));

for (const event of published) {
  const publicEvent = distById.get(event.id) || distByIdentity.get(publicIdentity(event));
  assert.ok(publicEvent, `${event.id} must have a public representative in dist/events.json`);
  assert.ok(publicEvent.program_outline, `${event.id} public representative must retain program_outline`);
}

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.totals.enriched, report.enriched.length, 'backlog report enriched total must match rows');
  assert.equal(report.totals.fetch_failures, report.failed.length, 'backlog report failure total must match rows');
}

console.log(`official-event-backlog-enrichment-regression-test: ok published=${published.length}`);
