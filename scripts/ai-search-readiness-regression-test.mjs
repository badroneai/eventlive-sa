import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const siteUrl = 'https://eventme.live';

function readText(relativePath) {
  const fullPath = path.join(distDir, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `dist/${relativePath} must exist; run npm run build first`);
  return fs.readFileSync(fullPath, 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

const eventsFeed = readJson('events.json');
const liveStatus = readJson('live-status.json');
const events = Array.isArray(eventsFeed) ? eventsFeed : eventsFeed.events || [];
assert.ok(events.length > 0, 'events.json must expose public events');

const counts = {
  events: events.length,
  activeOrUpcoming: events.filter((event) => event.status === 'ongoing' || event.status === 'upcoming').length,
  ended: events.filter((event) => event.status === 'ended').length,
  liveReady: events.filter((event) => event.live_schedule_ready).length,
  cities: new Set(events.map((event) => event.city_slug || event.city).filter(Boolean)).size,
  categories: new Set(events.map((event) => event.category_slug || event.category).filter(Boolean)).size,
  sourceImages: events.filter((event) => !event.generated_image && /\/assets\/event-images\//.test(event.image_url || '')).length
};

const robots = readText('robots.txt');
const llms = readText('llms.txt');
const aiPolicy = readText('ai-policy.txt');
const sitemap = readText('sitemap.xml');
const serviceWorker = readText('sw.js');
const legacyDomainPattern = /github\.io|eventlife/i;
const legacyBrandPattern = /\bEventMe\b/;

assert.match(robots, /^User-agent: \*/m, 'robots.txt must allow standard crawlers');
assert.match(robots, /Allow: \//, 'robots.txt must allow the public site');
assert.match(robots, /Host: eventme\.live/, 'robots.txt must preserve the production host');
assert.match(robots, /Sitemap: https:\/\/eventme\.live\/sitemap\.xml/, 'robots.txt must point to the production sitemap');
assert.doesNotMatch(robots, legacyDomainPattern, 'robots.txt must not leak legacy domains');
assert.doesNotMatch(robots, legacyBrandPattern, 'robots.txt must not leak old naming');

assert.match(llms, /^# EventLive/m, 'llms.txt must expose the EventLive identity');
assert.match(llms, new RegExp(`Primary domain: ${siteUrl.replace(/\./g, '\\.')}/`), 'llms.txt must expose the canonical domain');
assert.match(llms, new RegExp(`Events: ${counts.events}\\b`), 'llms.txt must publish the current event count');
assert.match(llms, new RegExp(`Active or upcoming events: ${counts.activeOrUpcoming}\\b`), 'llms.txt must publish active/upcoming count');
assert.match(llms, new RegExp(`Ended events preserved as normal event pages: ${counts.ended}\\b`), 'llms.txt must publish ended event count');
assert.match(llms, new RegExp(`Live-ready schedules: ${counts.liveReady}\\b`), 'llms.txt must publish live-ready schedule count');
assert.match(llms, new RegExp(`Cities: ${counts.cities}\\b`), 'llms.txt must publish city count');
assert.match(llms, new RegExp(`Categories: ${counts.categories}\\b`), 'llms.txt must publish category count');
assert.match(llms, new RegExp(`Events with source images: ${counts.sourceImages}\\b`), 'llms.txt must publish source-image count');

for (const expectedUrl of [
  `${siteUrl}/live-status.json`,
  `${siteUrl}/sources.json`,
  `${siteUrl}/readiness.json`,
  `${siteUrl}/activation.json`,
  `${siteUrl}/methodology.json`,
  `${siteUrl}/events.ics`,
  `${siteUrl}/sitemap.xml`,
  `${siteUrl}/organizers.html`,
  `${siteUrl}/saudi-events-today.html`,
  `${siteUrl}/riyadh-events-today.html`,
  `${siteUrl}/jeddah-events.html`,
  `${siteUrl}/online-tech-courses.html`,
  `${siteUrl}/saudi-events-faq.html`
]) {
  assert.match(llms, new RegExp(expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `llms.txt must include ${expectedUrl}`);
}

for (const ownerOnlyUrl of [
  `${siteUrl}/events.json`,
  `${siteUrl}/trust.html`,
  `${siteUrl}/sources.html`,
  `${siteUrl}/methodology.html`
]) {
  assert.doesNotMatch(llms, new RegExp(ownerOnlyUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `llms.txt must not promote owner-only ${ownerOnlyUrl}`);
}

assert.match(llms, /Prefer canonical event detail pages/i, 'llms.txt must guide AI systems to event detail pages');
assert.match(llms, /Treat ended events as normal public event records/i, 'llms.txt must define ended events as normal records');
assert.match(llms, /Do not present candidates, discovery-only signals, or draft records as confirmed/i, 'llms.txt must protect discovery-only data');
assert.match(llms, /Blocked or protected sources are not bypassed/i, 'llms.txt must preserve source ethics');
assert.doesNotMatch(llms, legacyDomainPattern, 'llms.txt must not leak legacy domains');
assert.doesNotMatch(llms, legacyBrandPattern, 'llms.txt must not leak old naming');

assert.match(aiPolicy, /^# EventLive AI and Search Policy/m, 'ai-policy.txt must expose a clear policy title');
assert.match(aiPolicy, /preserve the event source, date, city, venue, and canonical URL/i, 'ai-policy.txt must require event attribution');
assert.match(aiPolicy, /Ended events may be summarized as normal public event records/i, 'ai-policy.txt must allow historical event value');
assert.match(aiPolicy, /Do not present source candidates, discovery-only records, backlog rows, or draft data as confirmed public events/i, 'ai-policy.txt must protect unpublished data');
assert.match(aiPolicy, /Do not bypass protected sites, bot defenses, authentication walls, or partner-only APIs/i, 'ai-policy.txt must preserve acquisition boundaries');
assert.match(aiPolicy, /https:\/\/eventme\.live\/llms\.txt/, 'ai-policy.txt must point AI systems to llms.txt');
assert.doesNotMatch(aiPolicy, legacyDomainPattern, 'ai-policy.txt must not leak legacy domains');
assert.doesNotMatch(aiPolicy, legacyBrandPattern, 'ai-policy.txt must not leak old naming');

assert.match(sitemap, /https:\/\/eventme\.live\//, 'sitemap must keep production URLs');
assert.match(serviceWorker, /\.\/llms\.txt/, 'service worker must precache llms.txt');
assert.match(serviceWorker, /\.\/ai-policy\.txt/, 'service worker must precache ai-policy.txt');
assert.match(serviceWorker, /\.\/robots\.txt/, 'service worker must precache robots.txt');
assert.doesNotMatch(serviceWorker, /\.\/events\.json/, 'service worker must not precache owner-only events.json');
assert.doesNotMatch(serviceWorker, /\.\/trust\.html/, 'service worker must not precache owner-only trust.html');

if (liveStatus.totals) {
  assert.equal(liveStatus.totals.events, counts.events, 'live-status totals must match events.json count');
  assert.equal(liveStatus.totals.live_schedule_ready, counts.liveReady, 'live-status live-ready count must match events.json');
  assert.equal(liveStatus.totals.ended, counts.ended, 'live-status ended count must match events.json');
}

console.log(`ai-search-readiness-regression-test: ok events=${counts.events} liveReady=${counts.liveReady} cities=${counts.cities}`);
