import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isIdentityTranslatable } from './content-translation-cache.mjs';

// Blocking-structural gate (GATES-GOVERNANCE.md rule 1) for the
// translation-queue hygiene fix (2026-08-01, PM audit): two structural traps
// used to make the content-translation pending backlog "perpetual" —
// URL-dominant strings whose correct rendering is the source text itself
// (isIdentityTranslatable in content-translation-cache.mjs), and Latin-only
// brand marks the merge guard rejected forever (isBrandLikeSource,
// merge-content-translations.mjs). This gate pins the structural half: a
// string the identity classifier would resolve for free must never reach
// the pending backlog. The assertion is on the CLASSIFIER'S OWN OUTPUT
// against whatever is pending on the day the gate runs, not on any specific
// title/brand/source — so it holds regardless of which events are in the
// catalog (rule 2: assertions pin stable identities/structure, never
// translatable display text that rotates language every cycle).

const root = process.cwd();
const reportPath = path.join(root, 'reports', 'content-translation-pending.json');
assert.equal(fs.existsSync(reportPath), true, 'reports/content-translation-pending.json must exist; run npm run build first');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const pending = Array.isArray(report.pending) ? report.pending : [];

const offenders = pending.filter((row) => isIdentityTranslatable(row.source, row.target_lang));
assert.equal(
  offenders.length,
  0,
  `${offenders.length} pending row(s) are identity-translatable (URL-dominant, or already entirely in the target language) and should never have reached the queue: ${offenders
    .slice(0, 5)
    .map((row) => `[${row.source_lang}->${row.target_lang}] ${row.source.slice(0, 60)}`)
    .join(' | ')}`
);

// Wiring checks: a gate that only ever passes because the code that makes it
// meaningful was quietly removed is worse than no gate (GATES-GOVERNANCE.md
// rule 4 — "a gate that rarely activates is a time bomb"). Pin that the
// classifier actually runs inside translate() before a string is queued, and
// that the merge-time brand pass-through it depends on is still wired.
const cacheModule = fs.readFileSync(path.join(root, 'scripts', 'content-translation-cache.mjs'), 'utf8');
assert.match(cacheModule, /export function isIdentityTranslatable/, 'the identity-pass classifier must stay exported for this gate and its Python mirror to use');
assert.match(cacheModule, /trackPending && isIdentityTranslatable\(text, targetLang\)/, 'translate() must run the identity-pass classifier before a cache-miss string is added to the pending backlog');
assert.match(cacheModule, /method: 'identity-pass'/, 'identity-classified strings must resolve via a cached identity-pass entry, never by queueing');
assert.match(cacheModule, /export function isBrandLikeSource/, 'the brand-like heuristic must stay exported for merge-content-translations.mjs to use');

const mergeModule = fs.readFileSync(path.join(root, 'scripts', 'merge-content-translations.mjs'), 'utf8');
assert.match(mergeModule, /isBrandLikeSource/, 'the merge guard must recognize brand-like Latin marks for pass-through, or Latin brand names re-queue forever');
assert.match(mergeModule, /translated === normalizeContentText\(item\.source\)/, 'brand pass-through must require the output to be unchanged from the source — never a bypass for genuinely untranslated machine output');

const translator = fs.readFileSync(path.join(root, 'scripts', 'auto_translate_pending.py'), 'utf8');
assert.match(translator, /def is_identity_translatable/, 'the Python auto-translate loop must mirror the identity-pass classifier defensively (cheap net; the authoritative fix is at queue-build time)');
assert.match(translator, /if is_identity_translatable\(row\["source"\], row\["target_lang"\]\):/, 'the main translation loop must skip identity-classified rows before spending an MT call on them');

// Direct unit coverage of the classifier's two defining cases (structural,
// not content-dependent): a URL-dominant string with nothing else left to
// translate resolves to true; ordinary prose that merely contains a URL
// (real translation work, e.g. a chamber-of-commerce announcement) must
// never be misclassified as identity — that would silently drop real work.
assert.equal(isIdentityTranslatable('https://example.com/a/b?c=1', 'ar'), true, 'a pure URL has nothing translatable left after stripping — identity for any target');
assert.equal(isIdentityTranslatable('رابط المصدر: https://example.com/x', 'ar'), true, 'an Arabic label plus a URL is identity for an ar target — the label already matches the target language');
assert.equal(isIdentityTranslatable('رابط المصدر: https://example.com/x', 'en'), false, 'the same string for an en target still needs the Arabic label translated — not identity');
assert.equal(
  isIdentityTranslatable('يسر غرفة المدينة المنورة دعوتكم لحضور ورشة عمل رابط التسجيل: https://survey.porsline.com/s/abc', 'en'),
  false,
  'a real Arabic announcement that happens to end in a URL is genuine translation work, not identity — must not be misclassified'
);

console.log(`TRANSLATION_QUEUE_HYGIENE_OK pending=${pending.length} identity_offenders=0`);
