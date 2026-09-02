// The sanctioned fallback prose for a published event, and the single definition
// of it. Every published row owes a non-empty program_outline.official_description
// plus goals (official-event-backlog-enrichment-regression-test), so when a source
// publishes no usable prose, the catalog composes one from facts it already holds:
// title, provider, mode. Derived, never invented — AGENTS.md law 2.7.
//
// Extracted from enrich-official-event-backlog-details.mjs on 2026-09-01 so the
// attribution repair sweep writes the same sentence the backfiller would have,
// instead of a second copy that drifts away from it.

export function eventMode(event = {}) {
  const category = `${event.category || ''} ${event.tags?.join?.(' ') || ''} ${event.title || ''}`.toLowerCase();
  if (/bootcamp|course|training|workshop|دورة|تدريب|معسكر|ورشة/i.test(category)) return 'برنامج تدريبي';
  if (/festival|season|fan zone|families|entertainment|موسم|ترفيه|عائلات/i.test(category)) return 'تجربة حضور';
  if (/forum|summit|conference|ملتقى|قمة|مؤتمر/i.test(category)) return 'ملتقى أو مؤتمر';
  if (/exhibition|expo|auction|معرض|مزاد/i.test(category)) return 'معرض أو فعالية قطاعية';
  return 'فعالية';
}

export function fallbackEventDescription(event = {}, provider = '') {
  const title = String(event.title || '').replace(/\s+/g, ' ').trim();
  if (!title) return '';
  const source = String(provider || event.source_label || event.organizer || 'EventLive Source').replace(/\s+/g, ' ').trim();
  return `${title} فعالية منشورة من ${source} ضمن كتالوج EventLive.`;
}

export function fallbackEventGoals(event = {}) {
  return [
    `تقديم ${eventMode(event)} موثقة من مصدرها ضمن EventLive.`,
    'توضيح الموعد والمدينة والموقع قبل قرار الحضور.',
    'إثراء بطاقة الفعالية لتكون مفيدة للمستخدم والذكاءات ومحركات البحث.'
  ];
}
