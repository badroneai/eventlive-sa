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
  'SDAIA Calendar and Events',
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

const hayyJameelEvents = published.filter((event) => event.source_label === "Hayy Jameel What's On");
assert.ok(hayyJameelEvents.length >= 10, 'Hayy Jameel must retain broad official Jeddah coverage');
assert.equal(
  hayyJameelEvents.every((event) => /hayyjameel\.org\/wp-content\/uploads\//i.test(event.original_image_url || event.image_url || '')),
  true,
  'Hayy Jameel events must preserve their own high-resolution programme artwork'
);
assert.equal(
  hayyJameelEvents.every((event) => !/Shop Art Jameel|Explore Hayy Jameel|Venue Hire/i.test(event.program_outline?.official_description || '')),
  true,
  'Hayy Jameel official descriptions must not contain site navigation text'
);
assert.equal(
  hayyJameelEvents.every((event) => !/Shop Art Jameel|Explore Hayy Jameel|Venue Hire/i.test(`${event.description || ''} ${event.rich_summary || ''}`)),
  true,
  'Hayy Jameel rich descriptions must remain free of site navigation text'
);

for (const event of published.filter((row) => requiredSources.includes(row.source_label))) {
  assert.ok(event.program_outline.features?.length >= 4, `${event.id} backlog outline must include rich features`);
  assert.ok(event.program_outline.goals?.length >= 2, `${event.id} backlog outline must include attendance goals`);
  assert.ok(event.program_outline.requirements?.length >= 1, `${event.id} backlog outline must include attendance requirements`);
}

const ithraEvents = published.filter((event) => event.source_label === 'Ithra Events');
assert.ok(ithraEvents.length >= 100, 'Ithra official index should contribute broad active coverage');
assert.equal(
  ithraEvents.every((event) => event.program_outline?.source_method === 'official-public-algolia-index'),
  true,
  'Ithra outlines must retain their official public index provenance'
);
assert.equal(
  ithraEvents.every((event) => /official timed sessions/.test(event.program_outline?.faqs?.live_schedule_status || '')),
  true,
  'Ithra outlines must describe the extracted official session schedule'
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
