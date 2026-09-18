// A catalog row's public window (starts_at → ends_at) must contain its own official sessions.
//
// Incident 2026-09-19 (found by the Event Quality Lab, ~/code/eventlive-jev-poc): 96 Ithra rows
// carried sessions dated after their own ends_at, and 33 of them rendered as «منتهية» on every
// card surface (home, city, category, JSON-LD eventStatus) while up to 156 sessions were still
// scheduled. Root cause was a write-path asymmetry in scripts/auto-publish-source-candidates.mjs:
// mergeMissingCandidateEnrichment() refreshes `sessions` on every sync for a same-source
// candidate, but starts_at/ends_at were only refreshed while `hasPreciseLiveSchedule()` was
// still false — i.e. exactly once, on the sync that first granted the live schedule. From then on
// the window was frozen and the sessions kept rolling forward month after month.
//
// Policy (deliberately narrow, evidence-driven per AGENTS.md law 2):
//   - Only sessions whose session_type starts with `official-` and that carry valid datetimes
//     count. Attendance windows / opening hours / estimated sessions never move the window.
//   - ends_at is EXTENDED forward to the latest official session end. It is never pulled back,
//     so an organiser-declared closing date that outlives the last published session survives.
//   - starts_at is never touched. A monthly programme whose stored sessions reach back into
//     last year must not become a "started last year" record; the front-of-window semantics
//     (first active session, chosen at collection time) are left to the collector.
//   - time_precision is untouched: the session clock is exactly as sourced (law 2.6 spirit).
// Same public datetime contract auto-publish enforces (isValidPublicDateTime): KSA offset, no ms.
const PUBLIC_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/;
export function isStrictPublicDateTime(value = '') {
  return PUBLIC_DATETIME_RE.test(String(value || '')) && Number.isFinite(Date.parse(value));
}

export function latestOfficialSessionEnd(event = {}) {
  const sessions = Array.isArray(event.sessions) ? event.sessions : [];
  let latest = null;
  for (const session of sessions) {
    if (!String(session?.session_type || '').startsWith('official-')) continue;
    const end = session.ends_at || session.starts_at;
    if (!isStrictPublicDateTime(end)) continue;
    const at = Date.parse(end);
    if (!Number.isFinite(at)) continue;
    if (!latest || at > latest.at) latest = { at, value: end, session_id: session.id || '' };
  }
  return latest;
}

// Returns null when nothing changed, otherwise { previous_ends_at, ends_at, session_id }.
export function reconcileSessionWindow(event = {}) {
  const latest = latestOfficialSessionEnd(event);
  if (!latest) return null;
  const own = Date.parse(event.ends_at || '');
  if (Number.isFinite(own) && own >= latest.at) return null;
  const change = { event_id: event.id, previous_ends_at: event.ends_at, ends_at: latest.value, session_id: latest.session_id };
  event.ends_at = latest.value;
  return change;
}

export function reconcileCatalogSessionWindows(events = []) {
  const changes = [];
  for (const event of events) {
    const change = reconcileSessionWindow(event);
    if (change) changes.push(change);
  }
  return changes;
}

// Read-only check used by the regression gate: rows whose window still fails to contain their
// official sessions. Empty array = healthy.
export function findSessionWindowViolations(events = []) {
  const violations = [];
  for (const event of events) {
    const latest = latestOfficialSessionEnd(event);
    if (!latest) continue;
    const own = Date.parse(event.ends_at || '');
    if (!Number.isFinite(own) || own < latest.at) {
      violations.push({ event_id: event.id, ends_at: event.ends_at, latest_official_session_end: latest.value });
    }
  }
  return violations;
}
