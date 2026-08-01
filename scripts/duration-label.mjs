// EventLive — shared Arabic count-agreement duration labels, for any
// "N ساعة/يوم/دقيقة" UI text: event/facet-page countdowns ("يبدأ بعد N
// ساعة"), activation shells (print/share/signage), and the screen kiosk.
//
// Same defect class as WO-1/WO-2's banned "1 فعاليات": Arabic requires
// grammatical number agreement, not digit substitution into one fixed noun
// form. scripts/event-count-label.mjs's eventCountLabel implements this
// rule for "N فعالية"; this module re-applies the identical rule per
// duration unit instead of re-deriving the if/else chain inline a
// third/fourth/fifth time:
//   1      -> singular-with-"واحد(ة)"  (e.g. "ساعة واحدة")
//   2      -> dual                      (e.g. "ساعتان")
//   3-10   -> plural noun with digit     (e.g. "3 ساعات")
//   0, 11+ -> singular noun with digit   (e.g. "15 ساعة" — standard MSA
//             cardinal-number agreement)
//
// These three functions are the single source of truth for the rule.
// Browsers execute the countdown scripts as plain inline <script> text, not
// ES modules, so they can't `import` these directly. DURATION_LABEL_RUNTIME_JS
// derives the browser copy from `.toString()` on the exact same functions
// below instead of hand-retyping the logic a second time -- one
// implementation, never allowed to drift between build-time and client-side.
//
// Written in ES5-compatible syntax (var, string concatenation, no arrow
// functions/template literals) so the embedded copy works unmodified inside
// both the older `var`-based runtime scripts (liveRuntimeScript,
// activationRuntimeScript) and the newer const/let screen-kiosk script.

export function arabicHoursLabel(count) {
  var n = count > 0 ? count : 0;
  if (n === 1) return 'ساعة واحدة';
  if (n === 2) return 'ساعتان';
  if (n >= 3 && n <= 10) return n + ' ساعات';
  return n + ' ساعة';
}

export function arabicDaysLabel(count) {
  var n = count > 0 ? count : 0;
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومان';
  if (n >= 3 && n <= 10) return n + ' أيام';
  return n + ' يومًا';
}

export function arabicMinutesLabel(count) {
  var n = count > 0 ? count : 0;
  if (n === 1) return 'دقيقة واحدة';
  if (n === 2) return 'دقيقتان';
  if (n >= 3 && n <= 10) return n + ' دقائق';
  return n + ' دقيقة';
}

// Full trio, for scripts (liveRuntimeScript/activationRuntimeScript) whose
// `remaining()` composes day + hour + minute forms.
export const DURATION_LABEL_RUNTIME_JS = [arabicHoursLabel, arabicDaysLabel, arabicMinutesLabel]
  .map((fn) => fn.toString())
  .join('\n  ');

// Day-only, for the shorter "N يوم N س" kiosk/event-page formatters, whose
// hour/minute segments already use bare "س"/"د" abbreviation letters (not
// full nouns, so they carry no count-agreement defect to fix).
export const ARABIC_DAYS_LABEL_JS = arabicDaysLabel.toString();
