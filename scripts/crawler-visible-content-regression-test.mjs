// A page whose only content arrives by fetching a robots-disallowed file ships
// nothing to a crawler.
//
// dist/events.html — the site's own catalog hub, linked from every page — shipped
// an empty <section id="eventGrid"> filled at runtime from ./events-catalog.json.
// robots.txt disallows that file for `User-agent: *`, so Googlebot never fetched
// it. Measured on the deployed page: 0 event links, 234 words. Every one of the
// ~1,600 detail pages had exactly one fewer internal link than its own hub
// claimed to give it.
//
// The first fix — server-rendering 60 rows — was not enough on its own: the
// fetch's catch branch replaced the grid with "لم نستطع تحميل كتالوج الفعاليات",
// so the crawler still saw an empty catalog, and the counters still reported
// "0 فعالية في الكتالوج" over a screen holding 60 cards. Enhancement may not
// destroy what the server already rendered, and a failed load is not an empty
// catalog.
//
// This gate is written against the class, not against events.html: ANY indexable
// page that populates itself from a disallowed file must ship that content in
// its HTML.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const MIN_STATIC_LINKS = 20;

// ---------- robots.txt: what a crawler is told it may not fetch ----------
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
const disallowed = [];
let inStarGroup = false;
for (const rawLine of robots.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (/^user-agent\s*:/i.test(line)) inStarGroup = line.split(':')[1].trim() === '*';
  else if (inStarGroup && /^disallow\s*:/i.test(line)) {
    const value = line.split(':').slice(1).join(':').trim();
    if (value && value !== '/') disallowed.push(value.replace(/^\//, ''));
  }
}
assert.ok(disallowed.length > 0, 'robots.txt parsed to an empty disallow list — the gate would pass vacuously');

// ---------- every shipped HTML page ----------
function htmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const stripScripts = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '');
const offenders = [];
let audited = 0;
let withdrawn = 0;

for (const file of htmlFiles(dist)) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(dist, file);
  // noindex is the OTHER valid answer to this defect: a page may either ship the
  // content or stop claiming to be search content. Counted, not silently skipped,
  // so a page cannot escape the gate by quietly going noindex.
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) { withdrawn += 1; continue; }

  // Does this page depend on something a crawler is forbidden to fetch?
  //
  // Matching `fetch('<path>')` was the first attempt and it was worthless here:
  // events.html fetches `fetch(eventsFeedUrl)`, the path having been assigned to
  // a variable earlier, so the page this gate exists for was never audited. The
  // "audited > 0" assertion below is what exposed that. Match the path wherever
  // it appears in the page's own scripts instead.
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]).join('\n');
  // Comments are stripped before any structural matching below: a long enough
  // explanatory comment inside a catch block silently pushed the closing brace
  // out of the match window and turned a real check into a passing no-op.
  const code = scripts.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  // Path boundaries matter: every event detail page references its own
  // `<slug>-events.json`, which merely ENDS with the disallowed `events.json`.
  // A substring test flagged one such page and would have flagged more as slugs
  // change.
  const depends = disallowed.filter((target) => {
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|['"\`/])${escaped}(?:['"\`?#]|$)`).test(code);
  });
  if (!depends.length) continue;

  audited += 1;
  const visible = stripScripts(html);
  const links = new Set([...visible.matchAll(/href=["']([^"']*events\/[^"']+)["']/g)].map((match) => match[1]));
  if (links.size < MIN_STATIC_LINKS) {
    offenders.push(`${rel} fetches ${depends.join(', ')} but ships only ${links.size} static event links`);
  }

  // Enhancement may not destroy what the server rendered. This is asserted
  // because the first fix shipped without it: 60 rows were rendered into the
  // HTML and then wiped by the fetch's own catch branch, which is the branch a
  // crawler always takes.
  const wipesOnFailure = /catch\s*\([^)]*\)\s*{[\s\S]{0,500}?\.innerHTML\s*=\s*['"`]\s*<[^'"`]*class="empty"/.test(code);
  if (wipesOnFailure) offenders.push(`${rel} replaces its grid with an empty-state on fetch failure, discarding the server-rendered list`);

  // The failure must be recorded and consulted, not swallowed. Asserted by shape
  // rather than by name: some flag set inside the catch branch has to be read
  // somewhere else, or the render path cannot tell "empty" from "never loaded"
  // and will report zeros over rows the visitor can see.
  const failureFlags = [...code.matchAll(/catch\s*\([^)]*\)\s*{([\s\S]{0,2000}?)\n\s*}/g)]
    .flatMap((block) => [...block[1].matchAll(/(?:^|\s)([A-Za-z_$][\w$]*)\s*=\s*true\s*;/g)].map((match) => match[1]));
  const consulted = failureFlags.some((name) => (code.split(new RegExp(`\\b${name}\\b`)).length - 1) >= 3);
  if (!consulted) offenders.push(`${rel} does not record its fetch failure in a flag the render path reads, so its counters report zeros over visible rows`);
}

assert.ok(audited > 0, 'no page was audited — the fetch detection stopped matching, so this gate proves nothing');
assert.deepEqual(offenders, [], `pages whose content is invisible to a crawler:\n  ${offenders.join('\n  ')}`);

console.log(`CRAWLER_VISIBLE_CONTENT_OK audited=${audited} noindex_withdrawn=${withdrawn} disallowed_paths=${disallowed.length} min_static_links=${MIN_STATIC_LINKS}`);
