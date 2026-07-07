import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const indexPath = path.join(distDir, 'index.html');
const eventsPath = path.join(distDir, 'events.json');
const coversDir = path.join(distDir, 'assets', 'event-covers');

assert.equal(fs.existsSync(indexPath), true, 'dist/index.html must exist; run npm run build first');
assert.equal(fs.existsSync(eventsPath), true, 'dist/events.json must exist; run npm run build first');
assert.equal(fs.existsSync(coversDir), true, 'generated event covers directory must exist');

const html = fs.readFileSync(indexPath, 'utf8');
const eventsIndex = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const events = Array.isArray(eventsIndex.events) ? eventsIndex.events : [];
const generatedCoverEvents = events.filter((event) => String(event.image_url || '').startsWith('/assets/event-covers/'));

assert.ok(events.length >= 20, 'card cover layout test expects a useful public catalog');
assert.ok(generatedCoverEvents.length >= 3, 'catalog must include generated fallback covers');
assert.match(html, /\.card h3\s*\{[^}]*text-align:\s*center/s, 'home card titles must be centered');
assert.match(html, /\.card h3\s*\{[^}]*-webkit-line-clamp:\s*3/s, 'home card titles must allow three lines before clamping');

const cardTitleLinks = [...html.matchAll(/<h3><a\b[^>]*>/g)].map((match) => match[0]);
assert.ok(cardTitleLinks.length >= 6, 'home page should render multiple card title links');
for (const link of cardTitleLinks) {
  assert.match(link, /\sdir="auto"/, 'home card title links must use automatic text direction');
}

const requiredCoverNames = ['offshore', 'saudi', 'craft'];
const sampledCoverEvents = [
  ...generatedCoverEvents.filter((event) => requiredCoverNames.some((needle) => String(event.title || '').toLowerCase().includes(needle))),
  ...generatedCoverEvents
].slice(0, 12);

assert.ok(sampledCoverEvents.length >= 3, 'must have enough generated covers to sample');

for (const event of sampledCoverEvents) {
  const coverPath = path.join(distDir, event.image_url.replace(/^\//, ''));
  assert.equal(fs.existsSync(coverPath), true, `generated cover must exist for ${event.title}`);
  const svg = fs.readFileSync(coverPath, 'utf8');
  assert.doesNotMatch(svg, /<foreignObject\b/i, `generated cover must not rely on clipped foreignObject layout: ${event.title}`);
  assert.match(svg, /text-anchor="middle"/, `generated cover title must be centered: ${event.title}`);
  assert.match(svg, /unicode-bidi="plaintext"/, `generated cover title must preserve mixed Arabic/English direction: ${event.title}`);
  assert.match(svg, /x="700"/, `generated cover title must use the visual center line: ${event.title}`);
}

console.log(`card-cover-layout-regression-test: ok covers=${generatedCoverEvents.length} links=${cardTitleLinks.length}`);
