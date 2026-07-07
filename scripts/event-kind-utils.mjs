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

export function getEventStatus(startsAt, endsAt, now = Date.now(), kind = 'moment') {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return { key: 'draft', label: 'غير مكتملة' };
  }
  if (now < start) return { key: 'upcoming', label: 'قادمة' };
  if (now >= start && now <= end) {
    if (kind === 'program') return { key: 'ongoing', label: 'برنامج جارٍ' };
    return { key: 'live', label: 'مباشرة الآن' };
  }
  return { key: 'ended', label: 'منتهية' };
}

export function getEventRuntime(event, now = Date.now()) {
  const kind = classifyEventKind(event);
  const status = getEventStatus(event.starts_at || event.event_start, event.ends_at || event.event_end, now, kind);
  return { kind, kind_label: eventKindLabel(kind), status };
}
