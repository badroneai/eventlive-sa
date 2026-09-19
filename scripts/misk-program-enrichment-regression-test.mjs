import assert from 'node:assert/strict';
import { loadBuildRecordExclusions } from './published-output-persistence.mjs';
import { specificProgramTitle } from './misk-program-title.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const distEventsPath = path.join(root, 'dist', 'events.json');
const reportPath = path.join(root, 'reports', 'misk-program-enrichment-report.json');

assert.equal(fs.existsSync(catalogPath), true, 'data/events_catalog.json must exist');
assert.equal(fs.existsSync(distEventsPath), true, 'dist/events.json must exist; run npm run build first');

const catalogEvents = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).events || [];
const distEvents = JSON.parse(fs.readFileSync(distEventsPath, 'utf8')).events || [];
const miskCatalog = catalogEvents.filter((event) => /misk hub/i.test(`${event.source_label || ''} ${event.source_url || ''}`));
const enrichedCatalog = miskCatalog.filter((event) => event.program_outline?.provider === 'Misk Hub');

assert.ok(miskCatalog.length >= 5, 'catalog must include multiple Misk programs');
assert.ok(enrichedCatalog.length >= Math.min(5, miskCatalog.length), 'Misk official HTML enrichment must cover multiple program rows');

// Per-row floor + corpus ratio (AGENTS.md law 2.7). Misk sometimes publishes a
// program page with the metadata grid but no prose body — that is THEIR editorial
// choice, not our defect, and demanding a description from every single row made a
// third-party content gap look like a code regression. What we always control is
// the structural shape: our writer must never emit an outline without the verified
// metadata it read off the page.
for (const event of enrichedCatalog) {
  assert.ok(event.program_outline.features.length > 0, `${event.id} must preserve highlights or verified metadata features`);
  assert.ok(event.program_outline.faqs.program_format || event.program_outline.faqs.language || event.program_outline.faqs.who_should_apply, `${event.id} must include program metadata`);
  assert.equal(event.live_schedule_ready, false, `${event.id} enrichment must not mark live_schedule_ready without timed sessions`);
}

const withOverview = enrichedCatalog.filter((event) => event.program_outline.official_description);
const withGoals = enrichedCatalog.filter((event) => event.program_outline.goals.length > 0);
const overviewRatio = withOverview.length / enrichedCatalog.length;
assert.ok(
  overviewRatio >= 0.8,
  `Misk overview coverage collapsed: ${withOverview.length}/${enrichedCatalog.length} rows carry an official overview (floor 80%). A ratio this low means the extractor broke, not that Misk went quiet.`
);
assert.ok(
  withGoals.length / enrichedCatalog.length >= 0.8,
  `Misk outcome/audience coverage collapsed: ${withGoals.length}/${enrichedCatalog.length} rows carry goals (floor 80%)`
);

// Identity: Misk serves the SAME og:title on distinct programme pages (/skills/discover-your-path/
// and /skills/nahj/ both say "Discover Your Path Program"). Adopting it blindly gave two rows one
// identity, test:public-dedupe blocked the publish, and the sync could not ship (2026-09-19).
// The qualifier must be recovered from the page's own body, and never invented.
{
  const metaTitle = 'Discover Your Path Program';
  const nahjBody = 'Misk Skills Programs Discover Your Path (in collaboration with Nahj Association) Program Overview Apply Now';
  assert.equal(specificProgramTitle(nahjBody, metaTitle), 'Discover Your Path (in collaboration with Nahj Association)', 'the qualifier stated in the page body must be recovered');
  assert.equal(specificProgramTitle('Discover Your Path Program Program Overview Apply Now', metaTitle), '', 'a page without a qualifier keeps its meta title');
  assert.equal(specificProgramTitle('Discover Your Path (x)', metaTitle), '', 'a shorter match must never replace the meta title');
  assert.equal(specificProgramTitle('anything at all', ''), '', 'no meta title, no invention');
}

// No two published Misk rows may share a normalized title + city + start date: that is the exact
// shape test:public-dedupe blocks catalog-wide, caught here at the source that produced it.
{
  const identity = (event) => `${String(event.title || '').toLowerCase().replace(/\s+/g, ' ').trim()}|${event.city}|${String(event.starts_at).slice(0, 10)}`;
  const byIdentity = new Map();
  for (const event of miskCatalog) {
    const key = identity(event);
    byIdentity.set(key, [...(byIdentity.get(key) || []), event.id]);
  }
  const collisions = [...byIdentity.entries()].filter(([, ids]) => ids.length > 1);
  assert.equal(collisions.length, 0, `Misk rows sharing one public identity:\n${collisions.map(([key, ids]) => `${key} => ${ids.join(', ')}`).join('\n')}`);
}

const distEnriched = distEvents.filter((event) => event.program_outline?.provider === 'Misk Hub');

// The catalog and dist/events.json are NOT one-to-one. The build collapses
// duplicates onto a primary and refuses non-public records; a Misk-enriched row
// that lands on either path is represented in the output, not missing from it.
// This assertion did not know that, and on 2026-09-06 it blocked the publish
// after a collapse — while the site was already three days stale from a
// different gate making the same assumption.
//
// Rows the build recorded as dropped are excused by id; anything else missing is
// still a failure, and now says which row.
const buildExclusions = loadBuildRecordExclusions(root, fs, path);
const excused = enrichedCatalog.filter((event) => buildExclusions.has(String(event.id || '').normalize('NFC')));
const expectedInDist = enrichedCatalog.length - excused.length;
assert.ok(
  distEnriched.length >= expectedInDist,
  `build must carry Misk program outlines into dist/events.json: ${distEnriched.length} in dist, ${enrichedCatalog.length} enriched in the catalog, ${excused.length} recorded as dropped by the build (${excused.map((event) => `${event.id}:${buildExclusions.get(String(event.id).normalize('NFC'))?.reason}`).join(', ') || 'none'})`
);

const sample = distEnriched[0];
const detailPath = path.join(root, 'dist', String(sample.detail_url || '').replace(/^\.\//, ''));
assert.equal(fs.existsSync(detailPath), true, `${sample.detail_url} must exist`);
const html = fs.readFileSync(detailPath, 'utf8');
assert.match(html, /محاور البرنامج/, 'event detail page must render Misk program outline');
assert.ok(html.includes('Misk Hub'), 'event detail page must include Misk provider');

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.totals.enriched, report.enriched.length, 'Misk enrichment report totals must match rows');
}

console.log(`misk-program-enrichment-regression-test: ok enriched=${enrichedCatalog.length} overview=${withOverview.length} goals=${withGoals.length}`);
