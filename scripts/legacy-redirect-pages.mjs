// Transitional redirect stubs for URLs that were once first-class public
// pages (e.g. a category slug retired by a taxonomy merge). These are NOT
// content pages: they carry only a meta-refresh + canonical pointing at the
// real page, so dist-walking quality gates (design coverage, asset links,
// sitemap coverage, ...) must consult this set and skip them — the same
// single-source-of-truth idiom as scripts/owner-only-pages.mjs (WO-4).
// writeSitemap() and English localization already keep these files out of
// the sitemap; the stub's own <link rel="canonical"> handles crawlers.
//
// 2026-08-09: this list held exactly one slug, guarded by the reasoning that
// "only a slug that was once its own published category page earns a stub".
// Sound in principle, wrong in fact — Search Console was reporting 404s on
// /categories/regulatory-workshop.html, /en/categories/gaming-esports.html and
// /en/categories/entertainment-families.html, which proves those pages were
// published too. Nothing measured which aliases had ever shipped, so the list
// simply never grew.
//
// Deriving it from LEGACY_CATEGORY_SLUGS removes the guesswork instead of repeating
// it: the alias map is the authoritative record of "this slug was replaced by
// that one", every future taxonomy merge is covered the day it lands, and the
// cost of a stub for an alias that never shipped is one 400-byte file.
import { CATEGORY_TAXONOMY, LEGACY_CATEGORY_SLUGS } from './category-taxonomy.mjs';

const liveCategoryKeys = new Set(CATEGORY_TAXONOMY.map((category) => category.key));

export const LEGACY_CATEGORY_REDIRECTS = new Map(
  [...LEGACY_CATEGORY_SLUGS]
    // A retired slug that is itself a live category key is a synonym, not a retired
    // page — it has its own real page and must never be shadowed by a stub.
    .filter(([alias, target]) => !liveCategoryKeys.has(alias) && liveCategoryKeys.has(target))
    .sort(([left], [right]) => left.localeCompare(right))
);

// Top-level (dist root) pages retired in favour of a live equivalent that
// already covers the same search intent. First case, 2026-09-02: weekend.html
// was a committed static file from an older generator — no function in
// generate-site.mjs ever wrote it (it only appeared in removeDeadEventLinks's
// legacyPages list, which strips dead event links from it but never refreshes
// its content or its "مباشرة/جارية 8" hero count). It shipped linked from the
// site-wide "المزيد" nav menu and listed in sitemap.xml, permanently frozen at
// whatever build last hand-edited it. writeSearchIntentPages() already
// generates saudi-events-weekend.html fresh every build with the same
// "weekend" search intent (live event data, live-time chips, FAQ/ItemList
// JSON-LD) — reviving weekend.html as a second generator would just duplicate
// that page under a different filename. Retiring it here (same meta-refresh +
// canonical stub shape as LEGACY_CATEGORY_REDIRECTS, see
// writeLegacyTopLevelRedirectPages() in generate-site.mjs) is the correct fix
// per AGENTS.md law 10: the URL keeps working, it just forwards.
export const LEGACY_TOP_LEVEL_REDIRECTS = new Map([
  ['weekend.html', 'saudi-events-weekend.html']
]);

// English title/description for a top-level stub's EN mirror — the Arabic
// stub's body text has no dictionary entry (same reasoning as
// englishRedirectStubMeta()'s category branch in generate-localized-site.mjs),
// so the EN <title>/<meta> must be authored directly rather than translated.
export const LEGACY_TOP_LEVEL_REDIRECT_LABELS_EN = new Map([
  ['weekend.html', 'Saudi Weekend Events']
]);

export const LEGACY_REDIRECT_PAGES = new Set([
  ...[...LEGACY_CATEGORY_REDIRECTS.keys()].map((slug) => `categories/${slug}.html`),
  ...LEGACY_TOP_LEVEL_REDIRECTS.keys()
]);

/** dist-relative page path -> the page its canonical must point at, or ''. */
export function legacyRedirectTarget(relativePath = '') {
  const bare = String(relativePath).replace(/^en\//, '');
  const categoryMatch = bare.match(/^categories\/(.+)\.html$/u);
  if (categoryMatch) {
    const target = LEGACY_CATEGORY_REDIRECTS.get(categoryMatch[1]);
    return target ? `categories/${target}.html` : '';
  }
  return LEGACY_TOP_LEVEL_REDIRECTS.get(bare) || '';
}
