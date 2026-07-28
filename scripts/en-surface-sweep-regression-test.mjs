import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// English-surface sweep gate.
//
// 2026-07-28 lesson: every one of the 1,493 English pages shipped Arabic
// template chrome for days because nothing measured the built surface — the
// dictionary and the templates drifted apart silently. This test re-runs the
// diagnostic that exposed it, on every build, and separates the two failure
// classes mechanically:
//
//  1. TEMPLATE REGRESSION (hard fail): an Arabic line rendered on an English
//     page appears VERBATIM inside a generator source file. That can only be
//     template chrome added without a dictionary entry — a code defect that
//     must never ship.
//  2. RECURRING SURFACE DEBT (soft, reported): the same Arabic line appears
//     on many English pages without being template text (venue names, data
//     labels). That is dictionary/glossary work, not a build defect — it goes
//     into reports/i18n-en-surface.json for the autonomous health monitor,
//     never blocking the sync (owner rule: translation never breaks the sync).
//
// Content prose (unique per event) is expected while the MT backlog drains
// and is only counted.

const root = process.cwd();
const enDir = path.join(root, 'dist', 'en');
const REPEAT_THRESHOLD = 15;
const ARABIC_LETTERS = /[ء-ي]/u;
const INTENTIONAL = new Set(['العربية']);

assert.ok(fs.existsSync(enDir), 'dist/en must exist — run the site build first');

const templateSources = ['scripts/generate-site.mjs', 'scripts/generate-localized-site.mjs']
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

function walkHtmlFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkHtmlFiles(filePath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(filePath);
  }
  return files;
}

const pages = walkHtmlFiles(enDir);
assert.ok(pages.length > 500, `suspiciously few English pages (${pages.length}) — the sweep must run on a complete build`);

const lineOccurrences = new Map();
const attrOccurrences = new Map();
let pagesWithArabic = 0;

for (const filePath of pages) {
  const html = fs.readFileSync(filePath, 'utf8');
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const relative = path.relative(enDir, filePath);
  let pageHasArabic = false;

  for (const rawLine of withoutScripts.replace(/<[^>]+>/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line || !ARABIC_LETTERS.test(line) || INTENTIONAL.has(line)) continue;
    pageHasArabic = true;
    if (!lineOccurrences.has(line)) lineOccurrences.set(line, new Set());
    lineOccurrences.get(line).add(relative);
  }
  for (const match of withoutScripts.matchAll(/(?:alt|title|aria-label|placeholder)="([^"]*)"/g)) {
    const value = match[1].trim();
    if (!value || !ARABIC_LETTERS.test(value)) continue;
    pageHasArabic = true;
    if (!attrOccurrences.has(value)) attrOccurrences.set(value, new Set());
    attrOccurrences.get(value).add(relative);
  }
  if (pageHasArabic) pagesWithArabic += 1;
}

const templateHits = [];
const recurring = [];
let contentLines = 0;
for (const [text, pageSet] of [...lineOccurrences, ...attrOccurrences]) {
  if (templateSources.includes(text)) {
    templateHits.push({ text: text.slice(0, 120), pages: pageSet.size, example: [...pageSet][0] });
  } else if (pageSet.size >= REPEAT_THRESHOLD) {
    recurring.push({ text: text.slice(0, 120), pages: pageSet.size, example: [...pageSet][0] });
  } else {
    contentLines += 1;
  }
}
recurring.sort((a, b) => b.pages - a.pages);

const report = {
  schema: 'eventlive.i18n-en-surface.v1',
  generated_at: new Date().toISOString(),
  pages_scanned: pages.length,
  pages_with_arabic: pagesWithArabic,
  template_regressions: templateHits,
  recurring_surface_debt: recurring.slice(0, 50),
  recurring_total: recurring.length,
  content_prose_lines: contentLines
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'i18n-en-surface.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(`EN_SURFACE_SWEEP pages=${pages.length} with_arabic=${pagesWithArabic} template_regressions=${templateHits.length} recurring_debt=${recurring.length} content_lines=${contentLines}`);
for (const hit of recurring.slice(0, 5)) console.log(`- recurring (${hit.pages} pages): ${hit.text}`);

assert.equal(
  templateHits.length,
  0,
  `Arabic template chrome shipped on English pages — add dictionary/pattern coverage before merging:\n${templateHits.map((hit) => `- (${hit.pages} pages) ${hit.text} [e.g. ${hit.example}]`).join('\n')}`
);
console.log('EN_SURFACE_SWEEP_OK');
