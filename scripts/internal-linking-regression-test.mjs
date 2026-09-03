// Event pages must lead somewhere.
//
// Measured 2026-09-03, before this gate existed: of 1,603 Arabic event pages,
// every single one linked to ZERO other event pages, and 1,146 of them (71%) had
// no inbound internal link at all — a crawler could reach them only from the
// sitemap and a visitor could not reach them from another event at all. City and
// category hubs cap at 19 links each; events.html renders its list from a JSON
// file robots.txt disallows, so it contributes none.
//
// It matters twice over. Google's link guidance asks for descriptive anchor text
// and reads it when choosing a title link, and 72% of indexed pages are archives
// that still draw impressions — one dead page drew 1,135 in three months. A page
// that dead-ends wastes them; a page that offers what is on now does not.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'dist', 'events');
assert.equal(fs.existsSync(dir), true, 'dist/events must exist; run npm run build first');

const pages = fs.readdirSync(dir).filter((name) => name.endsWith('.html'));
assert.ok(pages.length > 100, `expected a real corpus of event pages, found ${pages.length}`);

const withoutSection = [];
const withoutLinks = [];
const genericAnchors = [];
const inbound = new Map();

for (const name of pages) {
  const html = fs.readFileSync(path.join(dir, name), 'utf8');
  // Redirect stubs are intentionally bare.
  if (/http-equiv="refresh"/i.test(html)) continue;
  const parts = html.split('data-section="related"');
  if (parts.length < 2) { withoutSection.push(name); continue; }
  const block = parts[1].split('</section>')[0];
  const links = [...block.matchAll(/href="\.\.\/events\/([^"]+)\.html"/g)].map((match) => match[1]);
  if (!links.length) { withoutLinks.push(name); continue; }
  for (const target of links) inbound.set(target, (inbound.get(target) || 0) + 1);
  // Anchor text must be the event's own name. "اقرأ المزيد" / "Read more" is what
  // Google's own docs give as the bad example.
  if (/>\s*(اقرأ المزيد|المزيد|اضغط هنا|Read more|Click here)\s*</i.test(block)) genericAnchors.push(name);
}

assert.ok(
  withoutSection.length <= 1,
  `${withoutSection.length} event pages ship no related-events section: ${withoutSection.slice(0, 5).join(', ')}`
);
assert.deepEqual(
  genericAnchors.slice(0, 10),
  [],
  'related-event links must use the event name as anchor text, never a generic "read more"'
);
// A page with nothing to offer is allowed — but it must be the rare exception,
// not the norm, or the section has quietly stopped working.
assert.ok(
  withoutLinks.length / pages.length < 0.05,
  `${withoutLinks.length}/${pages.length} event pages have a related section with no links in it`
);

// The links must actually resolve. A related block pointing at pages that do not
// exist would manufacture the very 404s this repo already fought once.
const missing = [...inbound.keys()].filter((slug) => !fs.existsSync(path.join(dir, `${slug}.html`)));
assert.deepEqual(missing.slice(0, 10), [], `${missing.length} related-event links point at pages that do not exist`);

const totalLinks = [...inbound.values()].reduce((sum, n) => sum + n, 0);
console.log(`INTERNAL_LINKING_OK pages=${pages.length} links=${totalLinks} targets=${inbound.size} link_less=${withoutLinks.length}`);
