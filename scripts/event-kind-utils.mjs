// EventLive — تصنيف طبيعة الفعالية ومنطق الحالة الموحد.
// "moment": فعالية لحظية محدودة الوقت (مؤتمر، حفل، معرض) — تستحق "مباشرة الآن" والعد التنازلي.
// "program": برنامج/نافذة ممتدة (تدريب، معسكر، موسم طويل) — داخل نافذته يكون "برنامج جارٍ" (ongoing)
// حتى لا يزاحم الفعاليات اللحظية في أسطح "الآن".

const DAY_MS = 24 * 60 * 60 * 1000;

export const PROGRAM_WINDOW_DAYS = 14;

export function classifyEventKind(event = {}) {
  const explicit = String(event.event_kind || '').toLowerCase();
  if (explicit === 'program' || explicit === 'moment') return explicit;
  const start = new Date(event.starts_at || event.event_start || '').getTime();
  const end = new Date(event.ends_at || event.event_end || '').getTime();
  if (!Number.isNaN(start) && !Number.isNaN(end) && end - start > PROGRAM_WINDOW_DAYS * DAY_MS) {
    return 'program';
  }
  return 'moment';
}

export function eventKindLabel(kind) {
  return kind === 'program' ? 'برنامج ممتد' : 'فعالية';
}

// A "مباشرة الآن" claim asserts something about THIS HOUR. That is only knowable
// when the whole window is short enough that "started and not ended" implies
// "open right now". A multi-day event is stored as ONE unbroken interval — there
// is no daily band in the schema — so `start <= now <= end` is just as true at
// 03:00 as at 15:00.
//
// Incident 2026-09-02 (owner report): leap-2026 is stored 2026-08-31T11:00 →
// 2026-09-03T21:00, an 82-hour span, and its daily programme ends at 21:00. At
// 23:00 on day two the site said "مباشرة الآن" for an event that had closed two
// hours earlier. Every one of the 15 cards on the live board that night was a
// multi-day window, so this was not an edge case — it was the whole board.
//
// The existing `program` kind already encoded this idea, but its threshold is 14
// DAYS (PROGRAM_WINDOW_DAYS), so a three-day conference sailed through as a
// "moment" and claimed the hour. 24 hours is the honest line: past it we know the
// event is within its dates and we do NOT know it is open now, so the label says
// exactly that.
export const LIVE_CLAIM_MAX_WINDOW_HOURS = 24;
const LIVE_CLAIM_MAX_WINDOW_MS = LIVE_CLAIM_MAX_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * The precision verdicts under which the clock on an event came from the source
 * rather than from us. Everything else — 'exact-start-estimated-end',
 * 'date-only', 'date-only-defaulted', 'unknown', or a missing field — means at
 * least one end of the window was invented by a collector default.
 *
 * Measured 2026-09-02: 36% of the published events whose window is short enough
 * to claim the hour carry a literal machine-written window (52 rows at exactly
 * 09:00→18:00, 22 at 00:00→23:59). Those passed the duration test and asserted
 * an hour no source ever published. A short window is necessary for the claim;
 * it was never sufficient.
 */
export const SOURCED_TIME_PRECISION = new Set(['exact', 'official-session-times']);

export function hasSourcedClock(event = {}) {
  return SOURCED_TIME_PRECISION.has(String(event?.time_precision || ''));
}

/**
 * True when the window is short enough that "inside it" means "happening now".
 * Kept as its own export so the client-side clock in generate-site.mjs and any
 * future surface assert the SAME line instead of re-deriving it.
 *
 * Duration only — the caller decides whether it also needs a sourced clock, so
 * that surfaces which merely SELECT events (membership) can keep using the cheap
 * test while surfaces that make a CLAIM about the hour use canClaimLiveNowFor().
 */
export function canClaimLiveNow(startMs, endMs) {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
  return endMs - startMs <= LIVE_CLAIM_MAX_WINDOW_MS;
}

/**
 * The full entitlement: a short window AND a clock the source actually published.
 * This is what any "مباشر الآن" claim must pass.
 */
export function canClaimLiveNowFor(event = {}) {
  const start = new Date(event?.starts_at || '').getTime();
  const end = new Date(event?.ends_at || event?.starts_at || '').getTime();
  return canClaimLiveNow(start, end) && hasSourcedClock(event);
}

export function getEventStatus(startsAt, endsAt, now = Date.now(), kind = 'moment') {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return { key: 'draft', label: 'غير مكتملة' };
  }
  if (now < start) return { key: 'upcoming', label: 'قادمة' };
  if (now >= start && now <= end) {
    if (kind === 'program') return { key: 'ongoing', label: 'برنامج جارٍ' };
    // Within its dates, but the hour is not ours to assert.
    if (!canClaimLiveNow(start, end)) return { key: 'ongoing', label: 'مستمرة هذه الأيام' };
    return { key: 'live', label: 'مباشرة الآن' };
  }
  return { key: 'ended', label: 'منتهية' };
}

export function getEventRuntime(event, now = Date.now()) {
  const kind = classifyEventKind(event);
  const status = getEventStatus(event.starts_at || event.event_start, event.ends_at || event.event_end, now, kind);
  return { kind, kind_label: eventKindLabel(kind), status };
}
