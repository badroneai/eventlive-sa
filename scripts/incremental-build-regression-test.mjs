import assert from 'node:assert/strict';
import fs from 'node:fs';
import { incrementalBuildDecision } from './incremental-build-utils.mjs';
import { eventSearchFingerprint } from './seo-discovery-utils.mjs';

const now = new Date('2026-07-12T12:00:00Z');
const healthyState = {
  schema: 'eventlive.incremental-build-state.v1',
  last_full_build_at: '2026-07-12T06:00:00Z',
  template_fingerprint: 'template-v1',
  seo_state_hash: 'seo-v1',
  event_count: 1173
};

function decision(overrides = {}) {
  return incrementalBuildDecision({
    state: healthyState,
    templateFingerprint: 'template-v1',
    seoStateHash: 'seo-v1',
    requiredOutputsPresent: true,
    eventArtifactCount: 1173,
    englishEventArtifactCount: 1173,
    changedPathsSinceState: ['data/events_catalog.json', 'reports/source-ops-report.json'],
    now,
    fullIntervalHours: 24,
    ...overrides
  });
}

assert.equal(decision().mode, 'incremental', 'a complete cache matching the prior SEO state must use the incremental route');
assert.equal(decision({ state: null }).mode, 'full', 'missing state must force a full build');
assert.equal(decision({ templateFingerprint: 'template-v2' }).mode, 'full', 'template changes must force a full build');
assert.equal(decision({ seoStateHash: 'seo-v2' }).mode, 'full', 'a cache from a different event state must never be reused');
assert.equal(decision({ requiredOutputsPresent: false }).mode, 'full', 'missing output contract files must force a full build');
assert.equal(decision({ englishEventArtifactCount: 1172 }).mode, 'full', 'an incomplete English event cache must force a full build');
assert.equal(decision({ changedPathsSinceState: ['dist/index.html'] }).mode, 'full', 'a committed public shell change must force a full bilingual rebuild');
assert.equal(decision({ now: new Date('2026-07-13T06:00:01Z') }).mode, 'full', 'the daily safety interval must force a complete rebuild');
assert.equal(decision({ forceFull: true }).mode, 'full', 'the operator full-build override must be authoritative');

const publicEvent = {
  id: 'event-1',
  file_slug: 'event-1',
  title: 'Saudi Event',
  starts_at: '2026-08-01T09:00:00+03:00',
  ends_at: '2026-08-01T17:00:00+03:00',
  city: 'الرياض',
  venue: 'قاعة 1',
  parking_info: 'P1',
  sessions: [{ id: 's1', title: 'Opening', starts_at: '2026-08-01T09:00:00+03:00' }],
  live_updates: [{ id: 'u1', title: 'Doors open', updated_at: '2026-08-01T08:00:00+03:00' }]
};
const publicFingerprint = eventSearchFingerprint(publicEvent);
assert.notEqual(eventSearchFingerprint({ ...publicEvent, parking_info: 'P2' }), publicFingerprint, 'attendance-detail changes must invalidate an event page');
assert.notEqual(eventSearchFingerprint({ ...publicEvent, sessions: [{ ...publicEvent.sessions[0], room: 'قاعة 2' }] }), publicFingerprint, 'agenda changes must invalidate an event page');
assert.notEqual(eventSearchFingerprint({ ...publicEvent, live_updates: [{ ...publicEvent.live_updates[0], title: 'Room changed' }] }), publicFingerprint, 'live-update changes must invalidate an event page');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.equal(packageJson.scripts.build, 'node scripts/run-smart-build.mjs');
assert.match(packageJson.scripts['build:full'], /EVENTLIVE_FORCE_FULL_BUILD=true/);
assert.match(packageJson.scripts['launch:site-gates'], /test:incremental-build/);

const generator = fs.readFileSync('scripts/generate-site.mjs', 'utf8');
assert.match(generator, /incrementalBuild[\s\S]*\[citiesDir, categoriesDir, audiencesDir, feedsDir\]/, 'incremental builds must preserve event detail and cover directories');
assert.match(generator, /eventDetailsToRender = incrementalBuild[\s\S]*changedEventSlugs/, 'only changed or missing event details should render incrementally');
assert.match(generator, /event_details_reused/, 'the build must report reused event details');
assert.match(generator, /if \(relativePath\.startsWith\('en\/'\)\) return false;/, 'the Arabic generator must not repatch the cached English tree');
const smartBuilder = fs.readFileSync('scripts/run-smart-build.mjs', 'utf8');
assert.match(smartBuilder, /scripts\/event-structured-data-utils\.mjs/, 'structured-data template changes must invalidate the incremental cache');
assert.match(smartBuilder, /build-template-changed[\s\S]*public-template-history-changed[\s\S]*forceSeoRefresh/, 'template changes must force a one-time SEO freshness refresh');
assert.match(smartBuilder, /EVENTLIVE_FORCE_SEO_REFRESH: forceSeoRefresh \? 'true' : 'false'/, 'the SEO refresh decision must reach the generator');
assert.match(generator, /forceSeoRefresh[\s\S]*!forceSeoRefresh && fs\.existsSync\(statePath\)/, 'a template refresh must invalidate the prior SEO page state');

const localizer = fs.readFileSync('scripts/generate-localized-site.mjs', 'utf8');
assert.match(localizer, /if \(!incrementalBuild\) fs\.rmSync\(enDir/, 'only full localization may delete the complete English tree');
assert.match(localizer, /pathsToProcess = incrementalBuild/, 'incremental localization must select changed or missing routes');
assert.match(localizer, /Routes reused:/, 'localization must report reuse explicitly');
assert.match(localizer, /storedFingerprint === translationFingerprint/, 'incremental localization must be invalidated when translation inputs change: ar->en merges change nothing on Arabic source pages, so without this gate freshly translated English pages ship stale');

const workflow = fs.readFileSync('.github/workflows/source-sync.yml', 'utf8');
assert.match(workflow, /Restore incremental site cache/);
for (const cachePath of ['dist/events', 'dist/en', 'dist/cities', 'dist/categories', 'dist/for', 'dist/feeds', 'dist/assets/event-covers', 'dist/.eventlive-build-state.json']) {
  assert.ok(workflow.includes(cachePath), `scheduled sync cache must retain ${cachePath}`);
}
assert.match(workflow, /eventlive-static-site-\$\{\{ runner\.os \}\}-/);
assert.match(workflow, /npm run test:incremental-build/);

console.log('INCREMENTAL_BUILD_REGRESSION_OK decision=incremental fallback_guards=8 cache_contract=8 public_fingerprint=3');
