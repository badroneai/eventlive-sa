// A search snippet must say what the page IS.
//
// Measured 2026-09-03: 1,160 of 1,602 event pages (72%) described an event that
// had already finished, and NOT ONE said so in its <title> or meta description —
// the only two things a searcher reads before deciding. Google served the site
// 34,600 impressions and got 444 clicks (1.3% CTR). A result that reads like a
// live event, with a 2025 date inside it, does not get clicked.
//
// Google names an "obsolete date" as a reason it discards an author's title
// outright (developers.google.com/search/docs/appearance/title-link), so the
// silence cost authored titles too.
//
// This is the same rule the rest of this repo already enforces — a surface may
// not claim a state it is not in — applied to the one surface that had never
// been checked: the SERP.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getEventRuntime } from './event-kind-utils.mjs';
import { assertEventSeoStatus } from './seo-time-precision-regression-test.mjs';

const root = process.cwd();
const now = Date.now();
const sourceByFile = new Map(JSON.parse(fs.readFileSync(path.join(root, 'dist', 'events-catalog.json'), 'utf8')).events
  .map((event) => [path.basename(event.detail_url || '').normalize('NFC'), event]));

const LOCALES = [
  { dir: path.join(root, 'dist', 'events'), label: 'ar' },
  { dir: path.join(root, 'dist', 'en', 'events'), label: 'en' }
];

let checkedTotal = 0;
let endedTotal = 0;
const archivedArabicTitles = [];
for (const locale of LOCALES) {
  assert.equal(fs.existsSync(locale.dir), true, `${locale.dir} must exist; run npm run build first`);
  let ended = 0;
  let checked = 0;
  for (const name of fs.readdirSync(locale.dir)) {
    if (!name.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(locale.dir, name), 'utf8');
    const endDate = html.match(/"endDate":\s*"([^"]+)"/)?.[1];
    if (!endDate) continue;
    checked += 1;
    const startDate = html.match(/"startDate":\s*"([^"]+)"/)?.[1];
    const precision = html.match(/data-time-precision="([^"]*)"/)?.[1];
    const isPast = getEventRuntime({ starts_at: startDate, ends_at: endDate, time_precision: precision }, now).status.key === 'ended';
    const { authoredTitle } = assertEventSeoStatus(html, isPast, locale.label, `${locale.label}/${name}`, sourceByFile.get(name.normalize('NFC')));
    // The TITLE specifically, not merely the description. The title is what a
    // searcher reads first, and an out-of-date title is the exact condition
    // Google names when it discards an author's title and writes its own.
    if (isPast) {
      ended += 1;
      if (locale.label === 'ar') archivedArabicTitles.push(authoredTitle);
    }
  }
  assert.ok(checked > 0, `${locale.label}: no event pages carried an endDate — the check would pass vacuously`);
  checkedTotal += checked;
  endedTotal += ended;
}

// The archive marker has to carry the edition, or "ended" tells a searcher
// nothing about which year's event they are looking at.
const arSample = archivedArabicTitles;
assert.ok(arSample.length > 0, 'expected at least one archived Arabic event page');
const withMonth = arSample.filter((title) => /—\s*منتهية\s+\S+\s+[٠-٩0-9]{4}/.test(title));
assert.ok(
  withMonth.length / arSample.length >= 0.9,
  `only ${withMonth.length}/${arSample.length} archived titles name the edition month and year`
);

console.log(`SNIPPET_HONESTY_OK pages=${checkedTotal} archived=${endedTotal} silent=0 mislabelled=0`);
