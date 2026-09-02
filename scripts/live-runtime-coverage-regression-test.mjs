// Factory guarantee for the live-status clock.
//
// eventCard() stamps `data-runtime-status` / `data-live-time` on every card so the
// page can re-derive "مباشرة الآن" / "منتهية" from the visitor's own clock. The
// attributes are inert on their own: liveRuntimeScript() is what reads them.
//
// writeSearchIntentPages() emitted the attributes and omitted the script, so 23
// public pages — the highest-intent SEO landing set (riyadh-events-today,
// jeddah-events, saudi-events-today, and their /en twins) — shipped chips that
// LOOKED wired and were frozen at build time forever. An event that ended at 9pm
// still read "مباشرة الآن" at 11pm, and no reload ever fixed it because the
// markup was correct and the driver was absent.
//
// The class ban: hooks without a driver is a defect, on every page, forever. Any
// new page type that renders event cards inherits this check for free — which is
// the point. Nobody has to remember.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
assert.equal(fs.existsSync(distDir), true, 'dist/ must exist; run npm run build first');

const pages = [];
for (const dir of [distDir, path.join(distDir, 'en')]) {
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (name.endsWith('.html')) pages.push(path.join(dir, name));
  }
}
assert.ok(pages.length > 0, 'no HTML pages found in dist/');

const inert = [];
const wired = [];
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const hooks = (html.match(/data-runtime-status/g) || []).length;
  if (!hooks) continue;
  // The driver may arrive either as the shared clock or as a page-local ticker
  // that recomputes status on an interval (today.html, events.html, screen.html
  // each own one). Both satisfy the invariant; neither may be absent.
  const driven = /updateLiveRuntime/.test(html)
    || /setInterval\(\s*(?:render|renderEvents|updateStatus|computeStatus|tick)\b/.test(html);
  (driven ? wired : inert).push({ page: path.relative(root, page), hooks });
}

inert.sort((a, b) => b.hooks - a.hooks);
assert.deepEqual(
  inert.map((row) => `${row.page} (${row.hooks} hooks)`),
  [],
  'these pages ship live-status hooks with nothing to drive them, so every "مباشرة الآن" chip on them is frozen at build time:'
);

console.log(`LIVE_RUNTIME_COVERAGE_OK pages_with_hooks=${wired.length} inert=0`);
