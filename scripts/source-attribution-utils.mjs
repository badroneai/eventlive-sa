// Shared composition of the "المصدر الرسمي: <جهة>." attribution sentence that the
// per-source enrichment writers append to `event.summary`.
//
// Incident 2026-09-01 (publishing outage, sync runs 33448363668 → 33533573061):
// five enrichers accept the PREVIOUSLY GENERATED `event.summary` as a fallback
// description input, then append the attribution sentence again. The generated
// value is therefore fed back into itself every run, so the suffix accumulates:
//
//   "Eligibility Criteria المصدر الرسمي: Misk Hub. المصدر الرسمي: Misk Hub."
//
// That doubled string is Arabic template chrome welded onto English source prose,
// which `test:en-surface-sweep` correctly rejects — and, because the sweep sits in
// the blocking `Regression checks` step, one poisoned row froze eventme.live for
// three days. The loop only stops "growing" because `firstSentence()` happens to
// cut at the first period; it never self-heals.
//
// The invariant these helpers enforce: an attribution sentence is CHROME, not
// content. It is stripped from anything read back as a description, and appended
// exactly once when a summary is composed. Composition is idempotent.

// The colon is load-bearing. Prose legitimately says "راجع رابط المصدر الرسمي قبل
// الحضور" (enrich-dhahran-expo-calendar-details.mjs) — that is body copy, not an
// attribution sentence, and must survive untouched.
const ATTRIBUTION_PATTERN = /\s*المصدر\s+الرسمي\s*:\s*[^.،؛]{1,80}(?:\.|$)/g;

export function normalizeWhitespace(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

/** How many attribution sentences a string carries. >1 is always a defect. */
export function countSourceAttributions(value = '') {
  return normalizeWhitespace(value).match(ATTRIBUTION_PATTERN)?.length || 0;
}

/**
 * Remove every attribution sentence from `value`.
 * Use on ANY value read back as a description input (`event.summary`,
 * `candidate.summary`, a cached `official_description`) so a generated suffix can
 * never re-enter the pipeline as if a source had published it.
 */
export function stripSourceAttribution(value = '') {
  return normalizeWhitespace(normalizeWhitespace(value).replace(ATTRIBUTION_PATTERN, ' '));
}

/**
 * Compose `<base> المصدر الرسمي: <label>.` with exactly one attribution sentence.
 * Idempotent: withSourceAttribution(withSourceAttribution(x, l), l) === withSourceAttribution(x, l).
 * Returns '' when nothing is left of the base — an attribution sentence alone is
 * not a summary.
 */
export function withSourceAttribution(base = '', label = '') {
  const body = stripSourceAttribution(base);
  const source = normalizeWhitespace(label).replace(/\.+$/, '');
  if (!body) return '';
  if (!source) return body;
  return `${body} المصدر الرسمي: ${source}.`;
}
