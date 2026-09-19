// "Is this row an event a visitor can attend, or something else wearing an event's clothes?"
//
// Wave 2 of the Event Quality Lab (2026-09-19) classified every public upcoming row with a typed
// question instead of a yes/no one. 109 of 372 came back as something other than an attendable
// event, in clean families. Three of those families are unambiguous, were hand-checked against
// their own source pages, and are what this module blocks at publication time:
//
//   enrolment-announcement  38 rows — Umm Al-Qura admission calls ("الترشح للدبلوم المتوسط في…",
//                                    "التسجيل والسداد لدبلوم…", "نموذج/رابط التسجيل والسداد…")
//                                    whose description is literally the paid-diploma admission
//                                    conditions, and Misk "Application Deadline …" rows. The
//                                    stored window is an application window or a placeholder
//                                    (2026-12-31 08:00→10:00), never something to attend.
//   standing-initiative     11 rows — Ministry of Culture initiatives: 2021→2030 style windows,
//                                    no sessions, description "Saudi Arabia Ministry of Culture".
//   open-call                2 rows — calls for submissions; visitors send something in.
//
// Deliberately NOT blocked, though the same pass flagged them: national/religious occasions
// (real, and useful to show), permanent destinations (they belong in the city-places layer —
// a product move, not a publication block), and recurring meeting bundles (a visitor does attend
// those). Each of those needs its own decision, not a blunt rule.
//
// This module only decides what may be PUBLISHED from now on. It never unpublishes a live row;
// that stays an owner decision.

const ENROLMENT_TITLE = [
  /الترشح\s+للدبلوم/u,
  /الترشيح\s+للدبلوم/u,
  /التسجيل\s+والسداد/u,
  /نموذج\s+التسجيل/u,
  /رابط\s+التسجيل/u,
  /^\s*application\s+deadline\b/iu,
  /^\s*registration\s+(?:now\s+)?open\b/iu
];
// The Umm Al-Qura applied-college admission boilerplate. When this is the whole description, the
// row is an admission notice no matter what its title says.
const ENROLMENT_DESCRIPTION = /شروط\s+القبول\s+للدبلومات\s+المدفوعة/u;
const OPEN_CALL_TITLE = [/\bopen\s+call\b/iu, /دعوة\s+مفتوحة/u];

const DAY_MS = 24 * 60 * 60 * 1000;
// A single attendable occasion does not run for more than a year. Length alone is not enough,
// though: Poppy Playtime at Boulevard City runs 424 days with no stored sessions and IS an
// attendable experience. What separates the two in this catalog is copy — every standing
// initiative carries the organisation's name as its whole description (32 characters: "Saudi
// Arabia Ministry of Culture"), while the long-running experiences carry real event copy
// (397 and 1,025 characters). So: long window + no session + no description of its own.
const STANDING_INITIATIVE_DAYS = 400;
const STANDING_INITIATIVE_MAX_DESCRIPTION = 120;

export function nonEventReason(row = {}) {
  const title = String(row.title || '');
  const description = `${row.description || ''} ${row.rich_summary || ''} ${row.summary || ''}`;
  if (ENROLMENT_TITLE.some((pattern) => pattern.test(title))) return 'enrolment-announcement';
  if (ENROLMENT_DESCRIPTION.test(description)) return 'enrolment-announcement';
  if (OPEN_CALL_TITLE.some((pattern) => pattern.test(title))) return 'open-call';
  const start = Date.parse(row.starts_at || '');
  const end = Date.parse(row.ends_at || '');
  const sessions = Array.isArray(row.sessions) ? row.sessions.length : Number(row.sessions_count || 0);
  const ownCopy = String(row.description || row.rich_summary || '').trim();
  if (Number.isFinite(start) && Number.isFinite(end)
    && (end - start) / DAY_MS > STANDING_INITIATIVE_DAYS
    && !sessions
    && ownCopy.length < STANDING_INITIATIVE_MAX_DESCRIPTION) {
    return 'standing-initiative';
  }
  return '';
}

export function nonEventRows(rows = []) {
  return rows
    .map((row) => ({ id: row.id, reason: nonEventReason(row) }))
    .filter((row) => row.reason);
}
