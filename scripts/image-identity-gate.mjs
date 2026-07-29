// Shared crop<->event identity gate for PDF-sourced poster images (WO-5).
//
// Root cause this exists for: scripts/visit-saudi-summer-pdf-utils.mjs names extracted
// crop images purely by PDF page number + on-page quadrant (e.g.
// visit-saudi-summer-2026-p038-bottom-left.jpg). That filename is overwritten in place
// every sync cycle with whatever card currently occupies that page/quadrant. A catalog
// event that captured the filename in an earlier cycle keeps the string forever (see
// mergeMissingCandidateEnrichment in auto-publish-source-candidates.mjs - an event only
// gets its image re-evaluated while image_url is empty/a generated cover). When the
// source PDF's layout shifts, the file's content silently drifts out from under the old
// event while a new event's title now matches the crop instead.
//
// The fix binds by identity (title-token overlap) instead of position, and re-checks
// existing assignments every cycle so drift self-heals without a human step.

// Arabic combining diacritics (tashkeel) + Quranic annotation marks.
const TASHKEEL_PATTERN = /[ؐ-ًؚ-ٟۖ-ۜ۟-۪ۨ-ٰۭ]/g;
// Zero-width joiners/marks + bidi control characters that can slip into extracted PDF/HTML text.
const INVISIBLE_CONTROL_PATTERN = /[​-‏‪-‮⁦-⁩]/g;

/**
 * Normalize Arabic (and Latin) text for identity comparison:
 * - strips tashkeel/diacritics and invisible bidi control characters
 * - normalizes alef variants (أ إ آ -> ا) so orthographic spelling variance doesn't break matching
 * - normalizes ta marbuta (ة -> ه), alef maksura (ى -> ي), hamza carriers (ؤ -> و, ئ -> ي) -
 *   the most common Arabic spelling/typing swaps between a source PDF and catalog titles
 * - lowercases Latin text, strips punctuation, collapses whitespace
 */
export function normalizeArabicIdentityText(value = '') {
  return String(value || '')
    .normalize('NFC')
    .replace(TASHKEEL_PATTERN, '')
    .replace(INVISIBLE_CONTROL_PATTERN, '')
    .replace(/[أإآا]/g, 'ا') // أ إ آ ا -> ا
    .replace(/ى/g, 'ي') // ى -> ي
    .replace(/ة/g, 'ه') // ة -> ه
    .replace(/ؤ/g, 'و') // ؤ -> و
    .replace(/ئ/g, 'ي') // ئ -> ي
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distinctive identity tokens: normalized word set, length >= minLength (default 3),
 * per WO-5's threshold spec ("compare word sets of length >= 3 chars").
 */
export function distinctiveTitleTokens(value = '', { minLength = 3 } = {}) {
  const normalized = normalizeArabicIdentityText(value);
  if (!normalized) return [];
  return [...new Set(normalized.split(' ').filter((token) => token.length >= minLength))];
}

export function identityTokenIntersection(tokensA = [], tokensB = []) {
  const setB = new Set(tokensB);
  return tokensA.filter((token) => setB.has(token));
}

/**
 * WO-5 gate: a crop may only be bound to an event if its identity tokens (in this
 * codebase, the PDF text-layer title extracted for that same card - see the PR
 * description's OCR reality check) intersect the event's title tokens above threshold.
 *
 * Passes when >=50% of the event title's distinctive words are matched, OR when >=2
 * distinctive words intersect (guards short titles where 50% would round to 1 word).
 */
export function passesImageIdentityGate(cropTokens = [], titleTokens = [], options = {}) {
  const minRatio = options.minRatio ?? 0.5;
  const minIntersection = options.minIntersection ?? 2;
  const matchedTokens = identityTokenIntersection(cropTokens, titleTokens);
  const ratio = titleTokens.length ? matchedTokens.length / titleTokens.length : 0;
  const passes = matchedTokens.length >= minIntersection || ratio >= minRatio;
  return { passes, ratio, matchedTokens };
}

const CROP_FILENAME_PATTERN = /^visit-saudi-summer-(\d{4})-p(\d{3})-(top|bottom)-(left|right)\.[a-z0-9]+$/i;

/**
 * Parses the positional identity encoded in a visit-saudi-summer-pdf-utils.mjs crop
 * filename. Returns null for anything that isn't one of these page/quadrant crops.
 */
export function parseVisitSaudiCropFilename(imageUrl = '') {
  const filename = String(imageUrl || '').split('/').filter(Boolean).pop() || '';
  const match = filename.match(CROP_FILENAME_PATTERN);
  if (!match) return null;
  return {
    filename,
    year: Number(match[1]),
    page: Number(match[2]),
    position: `${match[3].toLowerCase()}-${match[4].toLowerCase()}`
  };
}
