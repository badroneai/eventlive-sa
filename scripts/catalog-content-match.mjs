// "Is this string the site's own catalog content, or template chrome that failed
// to translate?"
//
// scripts/en-surface-sweep-regression-test.mjs flags any Arabic string on an
// English page that also appears in the Arabic shell. Catalog content matches
// that description by nature — an event's title, summary and alt text are the
// same on both surfaces when the event's official copy is Arabic — so it needs a
// way to tell the two apart. It had one, and the rule kept coming up short:
//
//   2026-09-04  an event SUMMARY ending in the Arabic source attribution was
//               read as chrome; the matcher knew titles only.
//   2026-09-06  an event's IMAGE ALT, «⁠CCNP | بوابة مهارات المستقبل», was read
//               as chrome and blocked a PR. Two reasons at once: the matcher
//               did not know alt text, and its containment check skips titles
//               under 12 characters — this event's title is "CCNP", four.
//
// Both were real catalog content, and both cost a red pipeline. Extracted here so
// the rule can be tested against the exact strings that defeated it, without a
// build.

// Word joiners and bidi controls carry no meaning for a text comparison and are
// invisible to whoever is reading the failure. 15 catalog records were measured
// carrying U+2060 inside image_alt; one of them is why this module exists. They
// are stripped on BOTH sides so an invisible character can never be the reason a
// string fails to match itself.
const INVISIBLE_FORMATTING = /[​-‏⁠-⁤⁦-⁩﻿]/g;

export function normalizeForMatch(value = '') {
  return String(value || '')
    .normalize('NFC')
    .replace(INVISIBLE_FORMATTING, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCatalogContentMatcher(events = []) {
  const slugParts = [];
  const titles = new Set();
  // Longer free text — summaries and alt text — matched by prefix, because the
  // page may truncate what the catalog holds in full.
  const prose = new Set();

  for (const event of events) {
    for (const field of ['file_slug', 'id']) {
      if (event?.[field]) slugParts.push(String(event[field]));
    }
    if (event?.image_url) slugParts.push(String(event.image_url).split('/').pop());
    for (const field of ['title', 'title_original', 'title_en']) {
      const value = normalizeForMatch(event?.[field]);
      if (value) titles.add(value);
    }
    for (const field of ['summary', 'rich_summary', 'description', 'image_alt']) {
      const value = normalizeForMatch(event?.[field]);
      if (value.length >= 8) prose.add(value);
    }
  }

  return function isCatalogContent(text) {
    const t = normalizeForMatch(text);
    if (!t) return false;
    if (titles.has(t)) return true;

    for (const part of slugParts) {
      if (!part || part.length < 8) continue;
      if (t.includes(part) || (t.length >= 8 && part.includes(t))) return true;
    }

    for (const title of titles) {
      // The 12-character floor still guards against a short generic title
      // swallowing unrelated chrome by containment...
      if (title.length >= 12 && t.includes(title)) return true;
      // ...but a SHORT title composed with something else is exactly the case
      // that broke: "CCNP" is four characters, and «CCNP | بوابة مهارات
      // المستقبل» is unmistakably that event and nothing else. Anchoring at the
      // start keeps it from matching chrome that merely mentions the word.
      if (title.length >= 3 && t.startsWith(title) && t.length > title.length) return true;
    }

    for (const value of prose) {
      if (t.startsWith(value.slice(0, 40)) || value.startsWith(t.slice(0, 40))) return true;
    }

    return false;
  };
}
