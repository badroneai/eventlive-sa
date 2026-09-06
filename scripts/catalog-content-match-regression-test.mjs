// Two red pipelines, two days apart, same shape: the English-surface sweep read
// the site's own catalog content as untranslated template chrome.
//
//   2026-09-04  «… loud, live, and with feeling. المصدر الرسمي: MDLBEAST.»
//               an event SUMMARY. The matcher knew titles only.
//   2026-09-06  «⁠CCNP | بوابة مهارات المستقبل»
//               an event's IMAGE ALT, which blocked PR #117. Two reasons at
//               once: the matcher did not know alt text, and its containment
//               check skips titles under 12 characters — this event's title is
//               "CCNP", four. The leading character is U+2060, a word joiner,
//               invisible in every log that reported it.
//
// Both were genuine catalog content and both stopped the pipeline. Tested against
// the literal strings, because a rule that is only exercised by a full build is
// only discovered to be wrong in CI.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildCatalogContentMatcher, normalizeForMatch } from './catalog-content-match.mjs';

const events = [
  {
    file_slug: 'event-ccnp',
    id: 'event-ccnp',
    title: 'CCNP',
    image_alt: '⁠CCNP | بوابة مهارات المستقبل'
  },
  {
    file_slug: 'event-mixtape',
    id: 'event-mixtape',
    title: 'Mixtape — Hip-Hop & RnB Night',
    summary: 'Mixtape — Hip-Hop & RnB Night From 90s throwbacks to trap cuts and slow jams, we’re bringing back the essence of Hip-Hop and RnB the way it was meant to be: loud, live, and with feeling. المصدر الرسمي: MDLBEAST.'
  }
];
const isCatalogContent = buildCatalogContentMatcher(events);

// ---------- the two strings that defeated the old rule ----------
assert.equal(
  isCatalogContent('⁠CCNP | بوابة مهارات المستقبل'),
  true,
  'an image alt composed from a four-character title is that event, not chrome'
);
assert.equal(
  isCatalogContent('CCNP | بوابة مهارات المستقبل'),
  true,
  'and it must match with the invisible word joiner stripped, since no log shows it'
);
assert.equal(
  isCatalogContent('Mixtape — Hip-Hop & RnB Night From 90s throwbacks to trap cuts and slow jams, we’re bringing back the essence of Hip-Hop and RnB the way it was meant to be: loud, live, and with feeling. المصدر الرسمي: MDLBEAST.'),
  true,
  'an event summary is catalog content whatever it ends with'
);
// A truncated summary — the page may carry less than the catalog holds.
assert.equal(
  isCatalogContent('Mixtape — Hip-Hop & RnB Night From 90s throwbacks to trap cuts'),
  true,
  'a truncated summary is still that summary'
);

// ---------- each path isolated ----------
// The two rules that rescue the CCNP case overlap on that string, so removing
// either one alone left the suite green. These cases can only be satisfied by one
// path each.
const altOnly = buildCatalogContentMatcher([{
  file_slug: 'event-long-name-here',
  title: 'A Perfectly Long Title Here',
  image_alt: 'غلاف EventLive لفعالية برنامج القيادة التنفيذية'
}]);
assert.equal(
  altOnly('غلاف EventLive لفعالية برنامج القيادة التنفيذية'),
  true,
  'alt text that does not begin with the title is reachable only by knowing image_alt'
);

const shortTitleOnly = buildCatalogContentMatcher([{ file_slug: 'ev', title: 'CCNP' }]);
assert.equal(
  shortTitleOnly('CCNP | بوابة مهارات المستقبل'),
  true,
  'a short title composed with a qualifier is reachable only by the start-anchored rule'
);

// ---------- and the chrome it must still catch ----------
// This is the whole point of the gate. Widening the rule must not make it blind.
for (const chrome of [
  'تصفية حسب المدينة',
  'آخر تحقق:',
  'فتح الجدول التجريبي الحي',
  'لا توجد فعاليات مطابقة الآن.',
  'العربية'
]) {
  assert.equal(isCatalogContent(chrome), false, `${chrome} is template chrome and must stay catchable`);
}

// A short title must not swallow chrome that merely mentions the word: the
// start-anchored rule is deliberately narrower than containment.
assert.equal(
  isCatalogContent('دورة CCNP والتسجيل مفتوح'),
  false,
  'a four-character title must not match chrome that only mentions it mid-sentence'
);

// ---------- normalization ----------
assert.equal(normalizeForMatch('⁠A​ B‎'), 'A B', 'invisible formatting and whitespace collapse away');
assert.equal(normalizeForMatch(''), '');

// ---------- the sweep must use the shared rule ----------
const sweep = fs.readFileSync(path.join(process.cwd(), 'scripts', 'en-surface-sweep-regression-test.mjs'), 'utf8');
// Anchored on the CALL, not the file: the import line alone keeps the name
// present, so a file-wide match stayed green when the sweep was rewired to a
// stub that answered "never catalog content" for everything.
assert.match(
  sweep,
  /isCatalogContent\s*=\s*buildCatalogContentMatcher\(/,
  'the sweep must build its matcher from the shared rule, not from a private copy or a stub'
);

// The live catalog is the real input; if a build has run, the rule must at least
// recognise the alt text of an event that has one.
const distPath = path.join(process.cwd(), 'dist', 'events.json');
if (fs.existsSync(distPath)) {
  const live = JSON.parse(fs.readFileSync(distPath, 'utf8')).events || [];
  const matcher = buildCatalogContentMatcher(live);
  const withAlt = live.find((event) => normalizeForMatch(event?.image_alt).length >= 8);
  if (withAlt) {
    assert.equal(matcher(withAlt.image_alt), true, `${withAlt.file_slug}: a live event's own alt text must be recognised as catalog content`);
  }
  console.log(`CATALOG_CONTENT_MATCH_OK cases=11 live_events=${live.length}`);
} else {
  console.log('CATALOG_CONTENT_MATCH_OK cases=11 live_events=not-built');
}
