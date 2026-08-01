// Transitional redirect stubs for URLs that were once first-class public
// pages (e.g. a category slug retired by a taxonomy merge). These are NOT
// content pages: they carry only a meta-refresh + canonical pointing at the
// real page, so dist-walking quality gates (design coverage, asset links,
// sitemap coverage, ...) must consult this set and skip them — the same
// single-source-of-truth idiom as scripts/owner-only-pages.mjs (WO-4).
// writeSitemap() and English localization already keep these files out of
// the sitemap; the stub's own <link rel="canonical"> handles crawlers.
export const LEGACY_CATEGORY_REDIRECTS = new Map([
  ['technology-training', 'technology-innovation']
]);

export const LEGACY_REDIRECT_PAGES = new Set(
  [...LEGACY_CATEGORY_REDIRECTS.keys()].map((slug) => `categories/${slug}.html`)
);
