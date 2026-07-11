import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const read = (name) => fs.readFileSync(path.join(distDir, name), 'utf8');
const readJson = (name) => JSON.parse(read(name));

for (const file of [
  'saudi-events-insights.html',
  'saudi-events-insights.json',
  'en/saudi-events-insights.html',
  'en/saudi-events-insights.json',
  'owner-search-growth.html',
  'owner-search-growth.json'
]) {
  assert.equal(fs.existsSync(path.join(distDir, file)), true, `${file} must be generated`);
}

const envelope = readJson('events.json');
const events = Array.isArray(envelope) ? envelope : envelope.events || [];
const active = events.filter((event) => event.status !== 'ended');
const insights = readJson('saudi-events-insights.json');
const insightsHtml = read('saudi-events-insights.html');
const englishHtml = read('en/saudi-events-insights.html');
const owner = readJson('owner-search-growth.json');
const ownerHtml = read('owner-search-growth.html');
const sitemap = read('sitemap.xml');
const robots = read('robots.txt');
const llms = read('llms.txt');

assert.equal(insights.totals.public_events, events.length);
assert.equal(insights.totals.active_events, active.length);
assert.equal(insights.totals.ended_events, events.length - active.length);
assert.equal(insights.completeness.source_evidence.count, active.filter((event) => event.source_url || event.evidence_url).length);
assert.equal(insights.completeness.source_images.count, active.filter((event) => !event.generated_image && /\/assets\/event-images\//.test(event.image_url || '')).length);
assert.equal(insights.completeness.long_descriptions.count, active.filter((event) => String(event.description || event.rich_summary || event.summary || '').replace(/\s+/g, ' ').trim().length >= 120).length);
assert.ok(insights.top_cities.length > 0);
assert.ok(insights.top_categories.length > 0);

assert.match(insightsHtml, /<meta name="robots" content="index,follow/);
assert.match(insightsHtml, /نبض فعاليات السعودية/);
assert.match(insightsHtml, /saudi-events-insights\.json/);
assert.doesNotMatch(insightsHtml, /8\/8|درجة جاهزية الحضور/);
assert.match(englishHtml, /<html[^>]+lang="en-SA"/);
assert.match(englishHtml, /Saudi events pulse/);
assert.match(englishHtml, /How these numbers are calculated/);

assert.equal(owner.active_events, active.length);
assert.equal(Array.isArray(owner.priority_events), true);
assert.equal(Array.isArray(owner.authority_opportunities), true);
assert.equal(owner.cadence, 'every_build_including_six_hour_source_sync');
assert.match(ownerHtml, /<meta name="robots" content="noindex,nofollow"/);
assert.match(ownerHtml, /أعلى فجوات المحتوى أولوية/);
assert.doesNotMatch(sitemap, /owner-search-growth\.html/);
assert.match(sitemap, /saudi-events-insights\.html/);
assert.match(robots, /Disallow: \/owner-search-growth\.json/);
assert.doesNotMatch(robots, /Disallow: \/saudi-events-insights\.json/);
assert.match(llms, /Saudi events insights:/);

console.log(`SEARCH_AUTHORITY_OK active=${active.length} gaps=${owner.priority_events.length} sources=${owner.authority_opportunities.length}`);
