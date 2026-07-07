// بوابة انحدار: تمييز الفعاليات اللحظية عن البرامج الممتدة.
// القاعدة المحمية: أي نافذة أطول من PROGRAM_WINDOW_DAYS لا يجوز أن تظهر "مباشرة الآن" أبداً.
import { classifyEventKind, eventKindLabel, getEventStatus, getEventRuntime, PROGRAM_WINDOW_DAYS } from './event-kind-utils.mjs';

const failures = [];
function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures.push(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
}

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-07-04T20:00:00+03:00');
const iso = (ms) => new Date(ms).toISOString();

// 1) تصنيف النوع
check('conference of 3 days => moment',
  classifyEventKind({ starts_at: iso(now - DAY), ends_at: iso(now + 2 * DAY) }), 'moment');
check('9-month program => program',
  classifyEventKind({ starts_at: '2026-04-01T09:00:00+03:00', ends_at: '2026-12-31T18:00:00+03:00' }), 'program');
check(`exactly ${PROGRAM_WINDOW_DAYS} days => moment (boundary)`,
  classifyEventKind({ starts_at: iso(now), ends_at: iso(now + PROGRAM_WINDOW_DAYS * DAY) }), 'moment');
check('explicit event_kind=moment overrides duration',
  classifyEventKind({ event_kind: 'moment', starts_at: iso(now), ends_at: iso(now + 90 * DAY) }), 'moment');
check('explicit event_kind=program overrides duration',
  classifyEventKind({ event_kind: 'program', starts_at: iso(now), ends_at: iso(now + DAY) }), 'program');
check('invalid dates => moment default',
  classifyEventKind({ starts_at: '', ends_at: '' }), 'moment');

// 2) الحالة حسب النوع
check('moment in-window => live',
  getEventStatus(iso(now - DAY), iso(now + DAY), now, 'moment').key, 'live');
check('program in-window => ongoing (NOT live)',
  getEventStatus(iso(now - 30 * DAY), iso(now + 60 * DAY), now, 'program').key, 'ongoing');
check('program before window => upcoming',
  getEventStatus(iso(now + 5 * DAY), iso(now + 90 * DAY), now, 'program').key, 'upcoming');
check('program after window => ended',
  getEventStatus(iso(now - 90 * DAY), iso(now - DAY), now, 'program').key, 'ended');
check('missing dates => draft',
  getEventStatus('', '', now, 'program').key, 'draft');

// 3) القاعدة المحمية: برنامج طويل داخل نافذته لا يحمل "مباشرة الآن"
const longWindow = getEventRuntime({ starts_at: '2026-04-01T09:00:00+03:00', ends_at: '2026-12-31T18:00:00+03:00' }, now);
check('long-window runtime kind', longWindow.kind, 'program');
check('long-window runtime never labeled live', longWindow.status.key === 'live', false);
check('long-window runtime label', longWindow.status.label, 'برنامج جارٍ');

// 4) تسميات النوع
check('kind label program', eventKindLabel('program'), 'برنامج ممتد');
check('kind label moment', eventKindLabel('moment'), 'فعالية');

if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('\nAll event-kind regression checks passed.');
