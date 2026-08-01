// EventLive — shared bad-pattern list for internal publish-policy prose that must never
// appear in a public-facing event summary.
//
// Root cause (see scripts/collect-source-candidates.mjs's extractMocCalendarPayload):
// a collector wrote its own internal publish-policy rationale ("retained as source
// evidence, not auto-published as a momentary event") straight into the visitor-facing
// `summary` field for long-duration MOC cultural-calendar records. That sentence is
// reasoning for the pipeline/reviewer, not visitor content, and it leaked onto public
// event cards (including archived/ended ones already published before this fix).
//
// This module is imported by all three layers of the fix so the bad-pattern list can
// never drift between them:
//   - scripts/collect-source-candidates.mjs   (must not write these patterns going forward)
//   - scripts/heal-internal-prose-summaries.mjs (rewrites existing catalog rows that already
//     carry them)
//   - scripts/prelaunch-data-quality-regression-test.mjs (gate: none may reach dist/events.json
//     for non-ended events)
//
// Add new patterns here (not inline at call sites) whenever a new internal-rationale
// phrasing is found leaking into a summary.
export const INTERNAL_PROSE_PATTERNS = [
  { id: 'retained-as-evidence', regex: /تحفظ\s*كدليل/ },
  { id: 'not-auto-published', regex: /لا\s*تنشر\s*تلقائ/ },
  { id: 'used-as-signal', regex: /تستخدم\s*كإشارة/ },
  { id: 'retained-as-signal', regex: /تحفظ\s*كإشارة/ }
];

export function findInternalProsePattern(text = '') {
  const value = String(text || '');
  for (const pattern of INTERNAL_PROSE_PATTERNS) {
    if (pattern.regex.test(value)) return pattern.id;
  }
  return null;
}

export function containsInternalProse(text = '') {
  return findInternalProsePattern(text) !== null;
}
