// Every timestamp the build writes into a page as a claim about that page's own
// freshness. Shared between the generator, which masks these before fingerprinting
// a page and then rewrites them from the reconciled date, and the regression test,
// which asserts behaviourally that none survive masking.
//
// Kept in one module for a specific reason: the gate used to read the generator's
// source and check that every pattern group used to REWRITE was also used to MASK.
// That catches an asymmetric edit, but not a symmetric one — deleting a pattern
// from both lists passes, and the effect is silent and total. The page keeps an
// unmasked build instant, its fingerprint changes on every build, and every page
// is restamped forever. This exact hole existed for the event pages' «آخر تحديث»
// sentence, which is written in different markup from the search-intent pages'
// labelled variant and was missed on the first pass.

// ISO-valued, machine-facing.
export const FRESHNESS_CLAIM_PATTERNS = [
  /(<meta property="og:updated_time" content=")([^"]*)(")/g,
  /("dateModified":")([^"]*)(")/g
];

// Human-readable, rendered in the page's own locale. Two markup shapes for the
// same claim: a labelled signal on the search-intent pages, a sentence on the
// event pages.
export const FRESHNESS_DISPLAY_PATTERNS = [
  /(<span>آخر تحديث<\/span><b>)([^<]*)(<\/b>)/g,
  /(آخر تحديث: )([^<]*)(<)/g
];

// Masked but never rewritten: these describe the BUILD and the COLLECTION RUN,
// which really did happen at that instant. They stay visible and keep changing —
// they just must not make an otherwise-identical page look modified.
export const BUILD_STAMP_PATTERNS = [
  /(آخر بناء: )([^<]*)/g,
  /(آخر مزامنة: )([^<]*)/g
];

export function maskFreshnessClaims(html = '') {
  return [...FRESHNESS_CLAIM_PATTERNS, ...FRESHNESS_DISPLAY_PATTERNS]
    .reduce((value, pattern) => value.replace(pattern, '$1<masked>$3'), html)
    .replace(BUILD_STAMP_PATTERNS[0], '$1<masked>')
    .replace(BUILD_STAMP_PATTERNS[1], '$1<masked>');
}

// isoDate goes to the machine-facing claims, displayDate to the human-facing ones.
// The caller supplies the formatted string so this module stays free of the
// generator's locale helpers.
export function applyFreshnessClaims(html = '', isoDate = '', displayDate = '') {
  return FRESHNESS_DISPLAY_PATTERNS.reduce(
    (value, pattern) => value.replace(pattern, `$1${displayDate}$3`),
    FRESHNESS_CLAIM_PATTERNS.reduce((value, pattern) => value.replace(pattern, `$1${isoDate}$3`), html)
  );
}
