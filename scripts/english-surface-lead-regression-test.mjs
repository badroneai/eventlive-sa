// The English facet pages opened in Arabic.
//
// Measured on the live site 2026-09-04: of the 62 English city, category and
// audience landing pages, 61 had an Arabic <p class="lead"> — the first line a
// reader sees under the H1 — and 0 had an English one. (The 62nd had no lead at
// all.) These are the pages meant to answer "events in Riyadh" and "conferences
// in Saudi Arabia" for an English reader.
//
// The cause was not a missing translation. Each page's own <meta name="description">
// already carried the correct English of that exact sentence, because descriptions
// go through en-seo-descriptions.mjs, which knows how to rebuild a COMPOSED facet
// sentence ("<label> in Saudi Arabia, with event time, venue, source…") around a
// translated label. The visible lead went through the plain dictionary instead,
// which can only match a whole string it has seen before — and a sentence composed
// per city and per category is never in it.
//
// So this gate asserts the property a reader cares about: an English page opens in
// English. It deliberately does NOT assert how — a page whose lead is authored,
// dictionary-translated or template-rebuilt all pass equally.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const enDir = path.join(root, 'dist', 'en');
const ARABIC = /[؀-ۿ]/u;

// The language switcher names the OTHER language in its own script, which is
// correct and must not be flagged: an English page offering «العربية» is right.
const ALLOWED_ARABIC_EXACT = new Set(['العربية']);

function htmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const pages = htmlFiles(enDir).filter((file) => !file.includes(`${path.sep}events${path.sep}`));
assert.ok(pages.length > 50, `expected a built English surface, found ${pages.length} pages`);

const arabicLeads = [];
const arabicHeadings = [];
let leadsChecked = 0;

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(enDir, file);

  for (const match of html.matchAll(/class="lead"[^>]*>([^<]*)</g)) {
    const text = match[1].replace(/\s+/g, ' ').trim();
    if (!text) continue;
    leadsChecked += 1;
    if (ARABIC.test(text) && !ALLOWED_ARABIC_EXACT.has(text)) {
      arabicLeads.push(`${relative}: ${text.slice(0, 70)}`);
    }
  }

  // An H1 is the other line that decides, in one glance, whether this page is in
  // the reader's language. Event titles are excluded above because an official
  // Arabic event name is not a translation failure.
  for (const match of html.matchAll(/<h1[^>]*>([^<]*)</g)) {
    const text = match[1].replace(/\s+/g, ' ').trim();
    if (text && ARABIC.test(text) && !ALLOWED_ARABIC_EXACT.has(text)) {
      arabicHeadings.push(`${relative}: ${text.slice(0, 70)}`);
    }
  }
}

// The source-attribution label travels attached to an event summary, so it turns
// up wherever that summary is reused — inside prose, inside an <li> composed with
// a URL, and inside screen.html's baked today.json payload, which is data rather
// than markup. 295 English pages carried the translated "Official source:" and 10
// did not; on those the label sat inside a mixed node no dictionary entry matches.
// Checked against the whole page, not against text nodes, for that reason.
const attributionLeaks = [];
for (const file of htmlFiles(enDir)) {
  const html = fs.readFileSync(file, 'utf8');
  if (/المصدر الرسمي\s*:/u.test(html)) attributionLeaks.push(path.relative(enDir, file));
}
assert.deepEqual(
  attributionLeaks.slice(0, 20),
  [],
  `these English pages ship the Arabic source-attribution label (${attributionLeaks.length} total):\n  ${attributionLeaks.slice(0, 20).join('\n  ')}`
);

assert.ok(leadsChecked > 40, `expected the English facet pages to carry leads, checked only ${leadsChecked}`);
assert.deepEqual(
  arabicLeads.slice(0, 20),
  [],
  `these English pages open with an Arabic lead (${arabicLeads.length} total):\n  ${arabicLeads.slice(0, 20).join('\n  ')}`
);
assert.deepEqual(
  arabicHeadings.slice(0, 20),
  [],
  `these English pages carry an Arabic H1 (${arabicHeadings.length} total):\n  ${arabicHeadings.slice(0, 20).join('\n  ')}`
);

console.log(`ENGLISH_SURFACE_LEAD_OK pages=${pages.length} leads=${leadsChecked} arabic_leads=0 arabic_h1=0 attribution_leaks=0`);
