import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'acorn';

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

// WO: template chrome doesn't only live in the two generator scripts — a
// handful of dist/*.html pages at the repo root are committed SHELLS that
// the build only ever PATCHES in place (surgical string/regex replacements
// on the existing file — see externalizeTodayAttendancePage(),
// patchEventsBrowsePage(), and the absence of any writer at all for
// my-events.html in scripts/generate-site.mjs). Their bulk chrome text
// therefore never appears verbatim in either generator script, so an Arabic
// leak on their English counterpart silently escaped this hard-fail into
// report-only "recurring debt" (or worse, invisible "content" bucketing
// when it only appears on one page) until dictionary coverage caught up.
// These three were verified individually (not assumed) to be chrome+runtime
// only — no per-event content is baked into them server-side; the event
// grids on today.html/events.html/my-events.html are empty containers
// populated client-side from JSON at runtime, same as the CSS
// ::before loading placeholder on events.html.
//
// Deliberately NOT included: audiences.html, categories.html, cities.html,
// this-week.html, this-month.html, today-events.html. Those are fully
// REGENERATED from html template literals inside generate-site.mjs
// (renderFacetPage()/writeText()) on every build, so their chrome already
// appears verbatim in scripts/generate-site.mjs and is already covered.
// Adding their own dist output as a templateSources input would be circular
// — the page's freshly generated Arabic bytes would always "match" the
// stale/mid-run dist copy of itself, permanently blinding this hard-fail
// for exactly the pages it's supposed to protect. Only add a dist/*.html
// shell here after confirming (like these three) that it is PATCHED, not
// fully rewritten, by the generator.
const templateShellFiles = ['today.html', 'events.html', 'my-events.html'];
// PR #57 (Arabic duration count-agreement) embeds scripts/duration-label.mjs
// verbatim into the client-side countdown via `.toString()` (see that
// file's header) — its Arabic literals therefore never appear in
// generate-site.mjs's own source text, only in the imported module. Without
// this, a regression here would have the exact same "escapes to
// report-only" gap this file exists to close.
const templateSharedModules = ['scripts/duration-label.mjs'];
const templateSources = [
  ...['scripts/generate-site.mjs', 'scripts/generate-localized-site.mjs', ...templateSharedModules].map((file) => path.join(root, file)),
  ...templateShellFiles.map((file) => path.join(root, 'dist', file))
]
  .filter((filePath) => fs.existsSync(filePath))
  .map((filePath) => fs.readFileSync(filePath, 'utf8'))
  .join('\n');

// WO-EN-surface: every text-based check above strips <script> before
// scanning (html.replace(/<script.../, '')) — deliberately, since script
// bodies contain plenty of Arabic that is CODE, not display text (e.g. the
// search-normalization character-class replacements in liveRuntimeScript's
// normalize(), which map alef/ta-marbuta/alef-maksura variants and must
// never be "translated"). That blind spot is exactly how the duration-label
// regression (PR #57) and a much larger pre-existing gap — every event
// page's shared session/countdown widget — shipped untranslated string
// literals on English pages with nothing measuring it.
//
// AST-based literal extraction (not text search) tells genuine string
// content apart from the surrounding code: only Literal nodes are visited,
// so identifiers, regex character classes, and comparison operators are
// structurally excluded. A minimum length of 2 additionally excludes
// single-character literals — the normalize() replacement targets ('ا',
// 'ه', 'ي') are exactly this shape, and no legitimate chrome string is a
// single character, so this filter has no observed false negatives against
// the current template surface.
function extractScriptLiterals(html) {
  const literals = new Set();
  const scriptBlocks = html.matchAll(/<script(?![^>]*type="application\/ld\+json")(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g);
  for (const [, script] of scriptBlocks) {
    let ast;
    try {
      ast = parse(script, { ecmaVersion: 'latest', sourceType: 'script' });
    } catch {
      continue; // malformed/unparseable inline script is not this gate's concern
    }
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'Literal' && typeof node.value === 'string') {
        const value = node.value.trim();
        if (value.length >= 2 && ARABIC_LETTERS.test(value)) literals.add(value);
      }
      for (const [key, value] of Object.entries(node)) {
        if (key === 'start' || key === 'end') continue;
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    };
    visit(ast);
  }
  return literals;
}

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
const scriptLiteralOccurrences = new Map();
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
  for (const literal of extractScriptLiterals(html)) {
    if (INTENTIONAL.has(literal)) continue;
    pageHasArabic = true;
    if (!scriptLiteralOccurrences.has(literal)) scriptLiteralOccurrences.set(literal, new Set());
    scriptLiteralOccurrences.get(literal).add(relative);
  }
  if (pageHasArabic) pagesWithArabic += 1;
}

const templateHits = [];
const scriptTemplateHits = [];
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
// Script literals: hard-failing this class turned out NOT to be cheap.
// Wiring extractScriptLiterals() into the same templateSources match as
// visible text (see git history of this file for the attempt) immediately
// surfaced 41 pre-existing gaps across screen.html, print.html, index.html,
// organizer-intake.html, and more of event.html — real leaks, but on pages
// outside this round's scope (today.html/events.html/my-events.html + the
// duration-label class), each needing individually-verified dictionary
// coverage the same way every fix in this file was verified. Hard-failing
// on undiagnosed pre-existing debt would block unrelated work, not just
// catch regressions.
//
// So the hard-fail here is scoped narrowly to what was actually asked for
// and actually cheap to verify: literals that verbatim-match
// scripts/duration-label.mjs specifically (the countdown count-agreement
// module from PR #57) — a regression in THAT class is what triggered this
// extension, and it's now fully fixed sitewide, so this check is a pure
// regression guard, not new debt to pay down. Everything else discovered by
// the AST walk still flows into recurring-debt/content below for
// visibility (addresses "the sweep gates strip <script> so this leak is
// invisible to them") without hard-blocking on it — the broader screen.html/
// print.html/index.html/organizer-intake.html gaps are reported to the PM
// as a follow-up rather than silently dropped or force-fixed under time
// pressure.
// Exact AST-literal matching, not text.includes(): duration-label.mjs's own
// header comment contains prose like "يبدأ بعد N ساعة" as a usage example —
// a substring check against the raw file text would false-positive-match
// the bare word "بعد" ("after"/"in") against that comment, hard-failing on
// something that was never a duration-label regression. Extracting only
// the module's actual String Literal nodes (the same technique used
// throughout this file for HTML, applied here to the .mjs source) matches
// what the module actually OUTPUTS, not everything mentioned in its prose.
const durationModuleLiterals = (() => {
  const modulePath = path.join(root, 'scripts', 'duration-label.mjs');
  if (!fs.existsSync(modulePath)) return new Set();
  let ast;
  try {
    ast = parse(fs.readFileSync(modulePath, 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
  } catch {
    return new Set();
  }
  const literals = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Literal' && typeof node.value === 'string' && ARABIC_LETTERS.test(node.value)) literals.add(node.value);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'start' || key === 'end') continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast);
  return literals;
})();
for (const [text, pageSet] of scriptLiteralOccurrences) {
  if (durationModuleLiterals.has(text)) {
    scriptTemplateHits.push({ text: text.slice(0, 120), pages: pageSet.size, example: [...pageSet][0] });
  } else if (pageSet.size >= REPEAT_THRESHOLD) {
    recurring.push({ text: text.slice(0, 120), pages: pageSet.size, example: [...pageSet][0], script: true });
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
  script_template_regressions: scriptTemplateHits,
  recurring_surface_debt: recurring.slice(0, 50),
  recurring_total: recurring.length,
  content_prose_lines: contentLines
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'i18n-en-surface.json'), `${JSON.stringify(report, null, 2)}\n`);

const allTemplateHits = [...templateHits, ...scriptTemplateHits];
console.log(`EN_SURFACE_SWEEP pages=${pages.length} with_arabic=${pagesWithArabic} template_regressions=${allTemplateHits.length} (dom=${templateHits.length} script=${scriptTemplateHits.length}) recurring_debt=${recurring.length} content_lines=${contentLines}`);
for (const hit of recurring.slice(0, 5)) console.log(`- recurring (${hit.pages} pages${hit.script ? ', script' : ''}): ${hit.text}`);

assert.equal(
  allTemplateHits.length,
  0,
  `Arabic template chrome shipped on English pages — add dictionary/pattern coverage before merging:\n${allTemplateHits.map((hit) => `- (${hit.pages} pages) ${hit.text} [e.g. ${hit.example}]`).join('\n')}`
);
console.log('EN_SURFACE_SWEEP_OK');
