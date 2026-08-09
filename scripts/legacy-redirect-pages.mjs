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

export const LEGACY_REDIRECT_PAGES = new Set(
  [...LEGACY_CATEGORY_REDIRECTS.keys()].map((slug) => `categories/${slug}.html`)
);

/** dist-relative page path -> the page its canonical must point at, or ''. */
export function legacyRedirectTarget(relativePath = '') {
  const match = String(relativePath).replace(/^en\//, '').match(/^categories\/(.+)\.html$/u);
  if (!match) return '';
  const target = LEGACY_CATEGORY_REDIRECTS.get(match[1]);
  return target ? `categories/${target}.html` : '';
}
