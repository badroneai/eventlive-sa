import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { parse } from 'acorn';
import { CATEGORY_TAXONOMY, categoryDefinitionByKey } from './category-taxonomy.mjs';
import { loadContentTranslations } from './content-translation-cache.mjs';
import { OWNER_ONLY_PAGES } from './owner-only-pages.mjs';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const enDir = path.join(distDir, 'en');
const siteUrl = 'https://eventme.live';
const changeManifestPath = path.join(root, '.eventlive-cache', 'site-change-manifest.json');
const requestedIncrementalBuild = String(process.env.EVENTLIVE_INCREMENTAL_BUILD || '').toLowerCase() === 'true';
const changeManifest = (() => {
  try {
    return JSON.parse(fs.readFileSync(changeManifestPath, 'utf8'));
  } catch {
    return null;
  }
})();
// English pages depend on inputs the Arabic change manifest cannot see:
// ar->en entries change NOTHING on the Arabic source pages, so a run that
// merges fresh machine translations and rebuilds incrementally would ship
// stale English pages forever. Fingerprint the translation inputs and force
// a full localization pass whenever they changed since the last pass.
const translationFingerprint = crypto.createHash('sha1')
  .update(fs.readFileSync(path.join(root, 'locales', 'en-SA-static.json')))
  .update(fs.existsSync(path.join(root, 'data', 'content_translations.json'))
    ? fs.readFileSync(path.join(root, 'data', 'content_translations.json'))
    : '')
  .digest('hex');
const fingerprintPath = path.join(enDir, '.translation-fingerprint');
const storedFingerprint = (() => {
  try {
    return fs.readFileSync(fingerprintPath, 'utf8').trim();
  } catch {
    return null;
  }
})();
const incrementalBuild = requestedIncrementalBuild
  && changeManifest?.schema === 'eventlive.site-change-manifest.v1'
  && changeManifest.mode === 'incremental'
  && fs.existsSync(enDir)
  && storedFingerprint === translationFingerprint;
const exact = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'en-SA-static.json'), 'utf8'));
for (const category of CATEGORY_TAXONOMY) exact[category.label_ar] = category.label_en;
const contentTranslations = loadContentTranslations();
for (const entry of Object.values(contentTranslations.entries || {})) {
  if (!entry?.source || !entry?.text) continue;
  if (entry.source_lang === 'en' && entry.target_lang === 'ar' && !exact[entry.text]) exact[entry.text] = entry.source;
  else if (entry.source_lang === 'ar' && entry.target_lang === 'en' && !exact[entry.source]) exact[entry.source] = entry.text;
}
// Single source of truth: scripts/owner-only-pages.mjs (see OWNER_ONLY_PAGES doc
// comment there — do not reintroduce a locally hand-rolled list here).
const ownerOnly = OWNER_ONLY_PAGES;
const catalogEnvelope = JSON.parse(fs.readFileSync(path.join(distDir, 'events-catalog.json'), 'utf8'));
const catalogEvents = catalogEnvelope.events || [];
const eventByPath = new Map(catalogEvents.map((event) => [String(event.detail_url || '').replace(/^\.\//, ''), event]));
for (const event of catalogEvents) {
  event.title_en = event.title_original || exact[String(event.title || '').trim()] || event.title;
}
const runtimeScriptCache = new Map();

function writeIfChanged(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === value) return false;
  fs.writeFileSync(filePath, value, 'utf8');
  return true;
}

function walkHtmlFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkHtmlFiles(filePath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(filePath);
  }
  return files;
}

const arabicDigits = new Map([['٠','0'],['١','1'],['٢','2'],['٣','3'],['٤','4'],['٥','5'],['٦','6'],['٧','7'],['٨','8'],['٩','9']]);
const wordReplacements = [
  ['يناير', 'January'], ['فبراير', 'February'], ['مارس', 'March'], ['أبريل', 'April'], ['مايو', 'May'], ['يونيو', 'June'],
  ['يوليو', 'July'], ['أغسطس', 'August'], ['سبتمبر', 'September'], ['أكتوبر', 'October'], ['نوفمبر', 'November'], ['ديسمبر', 'December'],
  ['الأحد', 'Sunday'], ['الاثنين', 'Monday'], ['الثلاثاء', 'Tuesday'], ['الأربعاء', 'Wednesday'], ['الخميس', 'Thursday'], ['الجمعة', 'Friday'], ['السبت', 'Saturday']
];

const runtimeLiteralMap = {
  'تصفية وترتيب (': 'Filter and sort (',
  'تعذر تحميل ملف الفعاليات. حاول تحديث الصفحة.': 'Could not load the events file. Refresh the page and try again.',
  '<div class="empty">لم نستطع تحميل كتالوج الفعاليات الآن.<br /><br /></div>': '<div class="empty">The event catalog could not be loaded right now.<br /><br /></div>',
  ' يوم ': ' days ',
  ' س': ' hr',
  ' س ': ' hr ',
  ' د': ' min',
  'غير مكتملة': 'Incomplete',
  'بانتظار اعتماد الوقت': 'Awaiting time confirmation',
  'تبدأ بعد ': 'Starts in ',
  'نافذة البرنامج مفتوحة وتنتهي بعد ': 'Program window open · ends in ',
  'تنتهي بعد ': 'Ends in ',
  'اكتملت الفعالية': 'Event completed',
  'X-WR-CALNAME:EventLive | سجل فعالياتي': 'X-WR-CALNAME:EventLive | My saved events',
  'الجدول الحي جاهز': 'Live schedule ready',
  'الجدول الحي قيد التفعيل': 'Live schedule pending activation',
  'يحدث الآن — ينتهي خلال': 'Live now · ends in',
  '<span class="live-dot"></span>يحدث الآن — ينتهي خلال': '<span class="live-dot"></span>Live now · ends in',
  'أقرب فعالية — تبدأ خلال': 'Next event · starts in',
  'افتح الجدول الحي': 'Open live schedule',
  ' فعالية محفوظة في هذا المتصفح.': ' events saved in this browser.',
  'احفظ الفعاليات المهمة لك للرجوع لها قبل الوصول وأثناء الحضور.': 'Save important events for quick access before arrival and during attendance.',
  '<div class="empty">لم تحفظ أي فعالية بعد. استخدم زر حفظ في بطاقات الفعاليات.</div>': '<div class="empty">No events saved yet. Use the save button on an event card.</div>',
  '">فتح</a><a href="': '">Open</a><a href="',
  '">تقويم</a><button type="button" data-save-event="': '">Calendar</a><button type="button" data-save-event="',
  '">إزالة</button></div>': '">Remove</button></div>',
  '<option value="">كل المدن</option>': '<option value="">All cities</option>',
  '<option value="">كل التصنيفات</option>': '<option value="">All categories</option>',
  '<option value="">كل الفئات</option>': '<option value="">All audiences</option>',
  '</div><a href="./events.html">استعراض الفعاليات</a></article>': '</div><a href="./events.html">Browse events</a></article>',
  'فتح الجدول': 'Open schedule',
  ' فعالية في الكتالوج | ': ' events in catalog | ',
  ' مباشرة الآن | ': ' live now | ',
  ' قادمة | ': ' upcoming | ',
  ' برنامج جارٍ | ': ' ongoing programs | ',
  ' تحتاج تفعيل جدول حي': ' need live schedule activation',
  'الأولوية الآن': 'Priority now',
  'فعالية مباشرة الآن': 'Live event now',
  'أقرب فعالية مفيدة': 'Nearest useful event',
  'لا توجد أولوية حالية': 'No current priority',
  'سيظهر هنا أقرب حدث قابل للتصرف.': 'The nearest actionable event will appear here.',
  'الفعالية القادمة': 'Next event',
  'لا توجد فعالية قادمة في الكتالوج حالياً.': 'No upcoming event is currently available in the catalog.',
  'فرصة تفعيل': 'Activation opportunity',
  'فعالية تحتاج جدولاً حياً': 'Event needs a live schedule',
  'كل الفعاليات القادمة لديها مسار واضح أو انتهت.': 'All upcoming events have a clear path or have ended.',
  'يعرض ': 'Showing ',
  ' من ': ' of ',
  ' نتيجة مطابقة، من أصل ': ' matching results from ',
  ' فعالية في الكتالوج': ' catalog events',
  'عرض المزيد (': 'Show more (',
  '<div class="empty">لا توجد فعاليات مطابقة الآن.<br /><br /><a href="./event.html">فتح الجدول التجريبي الحي</a></div>': '<div class="empty">No matching events right now.<br /><br /><a href="./event.html">Open the live schedule demo</a></div>',
  '">فتح الجدول الحي</a>': '">Open live schedule</a>',
  '">تفاصيل الفعالية</a>': '">Event details</a>',
  '">التفاصيل</a>': '">Details</a>',
  '">تقويم</a>': '">Calendar</a>',
  '" target="_blank" rel="noopener noreferrer">واتساب</a><a href="https://twitter.com/intent/tweet?text=': '" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="https://twitter.com/intent/tweet?text=',
  '<div class="catalog-note update-note">لديها ': '<div class="catalog-note update-note">Includes ',
  ' تحديثات حية. <a href="./updates.html">فتح مركز التحديثات</a></div>': ' live updates. <a href="./updates.html">Open updates center</a></div>',
  'هجين': 'Hybrid',
  'حضوري': 'In person',
  'غنى ': 'Richness ',
  '" target="_blank" rel="noopener noreferrer">الاتجاهات</a>': '" target="_blank" rel="noopener noreferrer">Directions</a>',
  ' جلسة</span><span>': ' sessions</span><span>',
  ' مسارات</span><span>': ' tracks</span><span>',
  ' قاعات</span><span>': ' rooms</span><span>',
  ' تحديثات</span><span>': ' updates</span><span>',
  'منشور': 'Published',
  '<br />القادمة: ': '<br />Next: ',
  '<div class="meta">المصدر: ': '<div class="meta">Source: ',
  'غير محدد': 'Not specified',
  '">حفظ في سجلي</button></div></div>': '">Save event</button></div></div>',
  '<p class="empty-state">لا توجد فعاليات ضمن النطاق المطلوب حاليا.</p>': '<p class="empty-state">No events are available in this time window.</p>',
  ' ساعة': ' hr',
  'أقل من دقيقة': 'Less than a minute',
  'وقت غير مؤكد': 'Time not confirmed',
  'يبدأ بعد ': 'Starts in ',
  'نافذة البرنامج مفتوحة، ينتهي بعد ': 'Program window open · ends in ',
  'ينتهي بعد ': 'Ends in ',
  'انتهت منذ ': 'Ended ',
  'تصفية وترتيب': 'Filter and sort',
  'التفاصيل والتفعيل': 'Details and activation',
  // WO-7: the multi-day range label built client-side in dist/events.html,
  // dist/today.html, and dist/my-events.html composes "من X إلى Y" from
  // separate literal fragments (the X/Y dates are only known at runtime,
  // so they can't be one translatable text node the way homeEventCard's
  // server-rendered range is). These two fragments are the literal AST
  // nodes rewriteRuntimeLiterals() sees; keep the exact spacing in sync
  // with multiDayRangeLabel() in all three shells.
  'من ': 'From ',
  ' إلى ': ' to '
};

function latinDigits(value = '') {
  return String(value).replace(/[٠-٩]/g, (digit) => arabicDigits.get(digit));
}

function translateText(value = '', depth = 0) {
  const leading = String(value).match(/^\s*/)?.[0] || '';
  const trailing = String(value).match(/\s*$/)?.[0] || '';
  let text = String(value).trim();
  if (!text) return value;
  if (exact[text]) {
    const mapped = exact[text];
    // Content-cache "originals" can themselves be mixed-language (an Arabic
    // label glued to an English value, e.g. "المنظم: King Abdulaziz…").
    // Re-run such results through the pattern layer instead of shipping them.
    if (depth < 3 && mapped !== text && /[ء-ي]/u.test(mapped)) {
      return `${leading}${translateText(mapped, depth + 1).trim()}${trailing}`;
    }
    return `${leading}${mapped}${trailing}`;
  }
  if (depth < 3 && text.startsWith('· ')) return `${leading}· ${translateText(text.slice(2), depth + 1).trim()}${trailing}`;
  if (text.includes('،')) {
    const parts = text.split('،').map((part) => part.trim());
    if (parts.every((part) => exact[part])) return `${leading}${parts.map((part) => exact[part]).join(', ')}${trailing}`;
  }
  text = latinDigits(text).replace(/[\u200e\u200f]/gu, '');
  if (depth < 3 && text.includes(' · ')) text = text.split(' · ').map((part) => translateText(part, depth + 1).trim() || part).join(' · ');
  if (depth < 3 && text.includes(' | ')) text = text.split(' | ').map((part) => translateText(part, depth + 1).trim() || part).join(' | ');
  for (const [source, target] of wordReplacements) text = text.replaceAll(source, target);
  text = text
    .replaceAll(' بتوقيت الرياض', ' Riyadh time')
    .replace(/(\d{1,2}:\d{2})\s*ص(?![\u0600-\u06ff])/gu, '$1 AM')
    .replace(/(\d{1,2}:\d{2})\s*م(?![\u0600-\u06ff])/gu, '$1 PM');
  const patterns = [
    [/^تصفح\s+(\d+)\s+فعالية$/u, 'Browse $1 events'],
    [/^خلال\s+(\d+)\s+أيام$/u, 'Within $1 days'],
    [/^(\d+)\s+فعالية من\s+(\d+)\s+مصدرًا مسجلًا · آخر مزامنة:\s*(.+)$/u, '$1 events from $2 registered sources · Last synced: $3'],
    [/^(.+)\s+·\s+حتى\s+(.+)$/u, '$1 · through $2'],
    [/^يبدأ بعد\s+(.+)$/u, 'Starts in $1'],
    [/^ينتهي بعد\s+(.+)$/u, 'Ends in $1'],
    [/^نافذة البرنامج مفتوحة، ينتهي بعد\s+(.+)$/u, 'Program window is open · ends in $1'],
    [/^(\d+)\s*يوم(?:\s+(\d+)\s*س(?:اعة)?)?$/u, (_, days, hours) => `${days} day${days === '1' ? '' : 's'}${hours ? ` ${hours} hr` : ''}`],
    [/^(\d+)\s*ساعة$/u, '$1 hr'],
    [/^(\d+)\s*دقيقة$/u, '$1 min'],
    [/^(\d+)\s*فعالية$/u, '$1 events'],
    [/^(\d+)\s*فعاليات$/u, '$1 events'],
    [/^عرض الفعالية رقم\s*(\d+)$/u, 'Show event $1'],
    [/^(\d+)\s*جلسة في الجدول$/u, '$1 sessions in the schedule'],
    [/^(\d+)\s*جلسات في الجدول$/u, '$1 sessions in the schedule'],
    [/^·\s*فعالية$/u, '· event'],
    [/^المصدر:\s*(.+)$/u, 'Source: $1'],
    [/^المدينة:\s*(.+)$/u, 'City: $1'],
    [/^آخر تحديث:\s*(.+)$/u, 'Last updated: $1'],
    [/^آخر مزامنة:\s*(.+)$/u, 'Last synced: $1'],
    [/^يعرض\s+(\d+)\s+من\s+(\d+)\s+نتيجة مطابقة، من أصل\s+(\d+)\s+فعالية في الكتالوج$/u, 'Showing $1 of $2 matching results from $3 catalog events'],
    [/^عرض المزيد\s*\((\d+)\)$/u, 'Show more ($1)'],
    [/^مستمرة حتى\s+(.+)$/u, 'Ongoing until $1'],
    [/^تبدأ\s+(\d{1,2}\s+\w+.*)$/u, 'Starts $1'],
    [/^من\s+(\d[^ء-ي]*?)\s+إلى\s+(\d[^ء-ي]*)$/u, 'From $1 to $2'],
    [/^الوقت:\s*(.+)$/u, (_, rest) => `Time: ${translateText(rest).trim()}`],
    [/^الفعالية:\s*(.+)$/u, 'Event: $1'],
    [/^([\d:T+.Z\-]+)\s+إلى\s+([\d:T+.Z\-]+)$/u, '$1 to $2'],
    [/^تبدأ\s+(\d[^ء-ي]*?)\s+إلى\s+(\d[^ء-ي]*?)\s+لمدة\s+(\d+)\s+ساعات$/u, 'Starts $1 to $2, duration $3 hours'],
    [/^المنظم:\s*(.+)$/u, 'Organizer: $1'],
    [/^الموقع:\s*(.+)$/u, 'Venue: $1'],
    [/^التاريخ:\s*(.+)$/u, (_, rest) => `Date: ${translateText(rest).trim()}`],
    [/^النافذة الزمنية:\s*(.+)$/u, (_, rest) => `Time window: ${translateText(rest).trim()}`],
    [/^(\d{1,2} \w+ \d{4}) في (\d{1,2}:\d{2} [AP]M) إلى (\d{1,2} \w+ \d{4}) في (\d{1,2}:\d{2} [AP]M)$/u, '$1 at $2 to $3 at $4'],
    [/^(\d+)\s*جلسة$/u, '$1 sessions'],
    [/^(\d+)\s*جلسات$/u, '$1 sessions'],
    [/^(\d+)\s*قاعات$/u, '$1 rooms'],
    [/^(\d+)\s*قاعة$/u, '$1 rooms'],
    [/^(\d+)\s*مسارات$/u, '$1 tracks'],
    [/^(\d+)\s*مسار$/u, '$1 tracks'],
    [/^(.+) - EventLive (JSON|ICS)$/u, (_, title, kind) => `${exact[title] || title} - EventLive ${kind}`],
    [/^غلاف EventLive لفعالية\s+(.+)$/u, (_, title) => `EventLive cover for ${exact[title] || title}`],
    [/^متى تبدأ\s+(.+)؟$/u, (_, title) => `When does ${exact[title] || title} start?`],
    [/^أين تقام\s+(.+)؟$/u, (_, title) => `Where does ${exact[title] || title} take place?`],
    [/^تقام الفعالية في\s+(.+)\.$/u, (_, place) => `The event takes place in ${place.split('، ').map((part) => exact[part] || part).join(', ')}.`],
    [/^تعتمد EventLive على\s+(.+)\s+أو رابط دليل ظاهر في صفحة الفعالية، مع إبقاء رابط المصدر للمراجعة\.$/u, (_, source) => `EventLive relies on ${exact[source] || source} or a directory link visible on the event page, and keeps the source link for review.`],
    [/^فتح\s+(.+)$/u, (_, target) => `Open ${exact[target] || target}`]
  ];
  for (const [pattern, replacement] of patterns) {
    if (pattern.test(text)) return `${leading}${text.replace(pattern, replacement)}${trailing}`;
  }
  // Test for Arabic LETTERS, not the whole Arabic block: '،' itself lives in
  // that block, so the old check left "Thursday، 23 July" carrying an Arabic
  // comma forever on otherwise fully translated dates.
  if (!/[\u0621-\u064a]/u.test(text)) text = text.replaceAll('،', ',').replaceAll('؟', '?').replaceAll('؛', ';');
  return `${leading}${text}${trailing}`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function englishEventSummary(event = {}, title = '', city = '') {
  const eventTitle = title || event.title_en || event.title || 'this event';
  const eventCity = exact[city] || event.city || city || 'Saudi Arabia';
  return `Official listing for ${eventTitle} in ${eventCity}. View verified timing, venue, directions, attendance details, and source information on EventLive.`;
}

const guideContent = {
  'guide-live-events-saudi.html': {
    title: 'How to use EventLive during an event',
    intro: 'A practical guide to checking what is live now, what starts next, how much time remains, and where to go.',
    sections: [
      ['Before you leave', 'Open the event page, confirm the official start time, venue, directions, and any registration requirement. Save the event for quick access.'],
      ['During attendance', 'Use the live status and agenda to identify the current session, next session, room, and operational updates.'],
      ['After the event', 'The page remains available as a verified historical record with its dates, venue, source, and published agenda.']
    ]
  },
  'guide-event-sources-methodology.html': {
    title: 'Event source and verification methodology',
    intro: 'How EventLive separates discovery leads from evidence and public publication.',
    sections: [
      ['Discovery', 'Marketplaces and aggregators may help identify an event, but they do not automatically qualify it for publication.'],
      ['Verification', 'Official government, organizer, venue, university, or approved partner evidence must confirm the event identity, time, and location.'],
      ['Publication', 'Automated checks validate required fields, prevent duplicates, preserve provenance, and record the latest verification time.']
    ]
  },
  'guide-organizers-live-schedule.html': {
    title: 'Organizer guide to live event schedules',
    intro: 'Turn an approved event program into a visitor-facing live reference.',
    sections: [
      ['Required inputs', 'Event identity, official source, start and end times, venue, rooms, sessions, speakers, and registration links where available.'],
      ['Visitor output', 'A mobile event page, live now-and-next agenda, directions, calendar files, QR access, and printable views.'],
      ['Event-day updates', 'Room changes, delays, entry instructions, and session updates are shown with clear timestamps and source ownership.']
    ]
  },
  'guide-saudi-events-data.html': {
    title: 'Saudi events data guide',
    intro: 'The structured fields EventLive uses to make event information useful, searchable, and verifiable.',
    sections: [
      ['Stable identity', 'Each event has a stable identifier, source identity, organizer, city, venue, and canonical page.'],
      ['Time model', 'All event and session times are stored as explicit timestamps in the Asia/Riyadh operating context.'],
      ['Provenance', 'Source links, confidence, verification status, update time, and publication decisions remain attached to every record.']
    ]
  },
  'guide-riyadh-events-live.html': {
    title: 'Live Riyadh events guide',
    intro: 'Find Riyadh conferences, exhibitions, workshops, training programs, entertainment, and public events by verified time and source.',
    sections: [
      ['Today and soon', 'Start with the Today and This Week views for the most time-sensitive results.'],
      ['Event details', 'Confirm the venue, official timing, directions, registration, and live agenda before traveling.'],
      ['Saved events', 'Save events to build a personal attendance list that remains available on your device.']
    ]
  },
  'guide-online-tech-courses-saudi.html': {
    title: 'Online technology courses in Saudi Arabia',
    intro: 'A source-aware guide to bootcamps, online courses, application windows, and technical training programs.',
    sections: [
      ['Program type', 'EventLive distinguishes a course or application window from a momentary live event.'],
      ['What to verify', 'Check eligibility, registration deadline, delivery mode, provider, duration, and official application link.'],
      ['Trusted providers', 'Official academies, government programs, universities, and verified training providers receive the strongest trust level.']
    ]
  },
  'guide-summer-events-saudi.html': {
    title: 'Saudi summer events guide',
    intro: 'Discover verified seasonal events across Saudi regions without losing the exact city, date, venue, or source.',
    sections: [
      ['Regional discovery', 'Browse by city and region to find festivals, family activities, cultural programs, and summer experiences.'],
      ['Time accuracy', 'Long-running seasons and individual sessions are modeled separately so countdowns remain meaningful.'],
      ['Before attending', 'Confirm operating dates, daily times, ticket requirements, age policies, and directions from the event page.']
    ]
  },
  'guide-ended-events-value.html': {
    title: 'Why EventLive preserves past events',
    intro: 'Past events remain normal event pages rather than being moved into a disconnected archive.',
    sections: [
      ['Visitor value', 'People can confirm when and where an event happened and revisit its published agenda.'],
      ['Search value', 'Stable historical pages build a useful Saudi event record for search engines and AI systems.'],
      ['Organizer value', 'Historical schedules support future planning, attendance analysis, and program comparisons.']
    ]
  }
};

function guideMarkup(config) {
  return `<section class="section"><div class="wrap"><div class="facet-focus facet-primary i18n-content-hero"><span class="eyebrow">EventLive Guide</span><h1>${escapeHtml(config.title)}</h1><p class="lead">${escapeHtml(config.intro)}</p></div><div class="grid">${config.sections.map(([title, body]) => `<article class="card"><div class="card-body"><h2 class="title">${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></div></article>`).join('')}</div><div class="event-quick-actions"><a class="cta" href="./events.html">Browse all events</a><a class="cta" href="./today-events.html">Today's events</a></div></div></section>`;
}

function organizersMarkup() {
  const sections = [
    ['What we receive', 'An official program file, verified web page, PDF, CSV, or structured schedule with clear source ownership.'],
    ['What visitors receive', 'A mobile live schedule showing what is happening now, what comes next, the room, directions, and important updates.'],
    ['Publication workflow', 'We normalize the data, verify dates and sources, prevent duplicates, generate the event page, and run release gates before publishing.'],
    ['Event-day operations', 'Room changes, delays, entry instructions, and agenda updates can be published with a clear timestamp and responsible source.'],
    ['Trust requirements', 'Public events require official evidence. Discovery listings are never presented as verified organizer information without confirmation.'],
    ['Delivery package', 'Event page, live agenda, QR code, calendar file, sharing link, print view, and structured data for technical teams.']
  ];
  return `<section class="section"><div class="wrap"><div class="facet-focus facet-primary i18n-content-hero"><span class="eyebrow">For organizers</span><h1>Make your event clear at the moment of attendance</h1><p class="lead">EventLive turns an approved event program into a dependable live reference for visitors across mobile devices, venue screens, QR access, and search.</p><div class="event-quick-actions"><a class="cta" href="./organizer-intake.html">Submit event information</a><a class="cta" href="./today.html">View the visitor experience</a></div></div><div class="grid">${sections.map(([title, body]) => `<article class="card"><div class="card-body"><h2 class="title">${title}</h2><p>${body}</p></div></article>`).join('')}</div></div></section>`;
}

function aboutMarkup() {
  const sections = [
    ['What EventLive provides', 'EventLive is not a ticket marketplace or a directory of links. Its core value is attendance truth at the right moment: countdowns, live status, sessions, venue, directions, and the source page.'],
    ['How trust is protected', 'Every public event includes inspectable source evidence. Discovery leads do not automatically become published facts, and unknown details are never presented as confirmed.'],
    ['How information stays fresh', 'An automated cycle runs every six hours to collect changes, prevent duplicates, validate time and city, rebuild Arabic and English pages, and publish only after quality checks pass.'],
    ['Operator and contact', 'EventLive is operated by Samirah Mohammed Al Salman Establishment for Communications and Information Technology. Send official event programs to hello@eventme.live.']
  ];
  return `<nav class="breadcrumbs wrap" aria-label="Breadcrumb"><a href="./">EventLive</a><span>/</span><strong>About</strong></nav><section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>Live attendance reference</span><h1>About EventLive</h1><p class="lead">We are building a Saudi reference that helps visitors before and during an event: when it starts, what is live now, what comes next, where to go, and which source confirms the information.</p></div></section><section class="section"><div class="wrap grid">${sections.map(([title, body]) => `<article class="activation-card"><h2>${title}</h2><p>${body}</p></article>`).join('')}</div></section><section class="section"><div class="wrap"><article class="readiness"><h2>Start with your need</h2><p>Browse events, start from your city, or submit an official event program for a visitor-facing live page and schedule.</p><div class="activation-actions"><a class="cta" href="./events.html">Browse events</a><a class="cta" href="./cities.html">Choose a city</a><a class="cta" href="./organizers.html">For organizers</a><a class="cta" href="./guides.html">Guides</a></div></article></div></section>`;
}

function faqMarkup() {
  const faqs = [
    ['What is EventLive?', 'EventLive is a live reference for events across Saudi Arabia, focused on verified timing, venue, source, directions, and event-day usefulness.'],
    ['Is EventLive a ticket marketplace?', 'No. EventLive may link to an official registration or ticket page, but its primary role is trusted event information and live schedules.'],
    ['Does EventLive publish every listing it discovers?', 'No. Discovery sources create leads. Public publication requires official, organizer, venue, university, government, or approved partner evidence.'],
    ['Why are past events still visible?', 'Past events remain as normal historical records, preserving their dates, location, source, and published agenda.'],
    ['How often is event information refreshed?', 'The automated source pipeline runs every six hours and republishes the site after validation and trust gates pass.']
  ];
  return `<section class="section"><div class="wrap"><div class="facet-focus facet-primary i18n-content-hero"><span class="eyebrow">Quick guide</span><h1>Saudi events FAQ</h1><p class="lead">Straight answers about discovery, verification, live schedules, historical events, and EventLive's role.</p></div><div class="grid">${faqs.map(([question, answer]) => `<article class="card"><div class="card-body"><h2 class="title">${question}</h2><p>${answer}</p></div></article>`).join('')}</div><div class="event-quick-actions"><a class="cta" href="./events.html">Browse all events</a><a class="cta" href="./guide-event-sources-methodology.html">Read the source methodology</a></div></div></section>`;
}

function guidesIndexMarkup() {
  const guides = [
    ['guide-live-events-saudi.html', 'Using EventLive during an event', 'A visitor-first walkthrough of live status, countdowns, agendas, venues, and directions.'],
    ['guide-event-sources-methodology.html', 'Source and verification methodology', 'How discovery, official evidence, trust gates, deduplication, and publication work.'],
    ['guide-organizers-live-schedule.html', 'Live schedules for organizers', 'The inputs, visitor outputs, and event-day update workflow for a dependable live program.'],
    ['guide-saudi-events-data.html', 'Saudi events data guide', 'The identity, time, place, provenance, and trust fields behind every EventLive record.'],
    ['guide-riyadh-events-live.html', 'Live Riyadh events', 'How to find relevant Riyadh events by verified time, venue, category, and source.'],
    ['guide-online-tech-courses-saudi.html', 'Online technology courses', 'Find application windows, bootcamps, courses, eligibility, and official registration links.'],
    ['guide-summer-events-saudi.html', 'Saudi summer events', 'Browse seasonal activity by region while preserving exact dates, city, venue, and source.'],
    ['guide-ended-events-value.html', 'The value of past events', 'Why completed events remain normal, useful pages for visitors, organizers, search, and analysis.'],
    ['saudi-events-faq.html', 'Saudi events FAQ', 'Clear answers about EventLive, verification, tickets, historical records, and update frequency.']
  ];
  return `<section class="section"><div class="wrap"><div class="facet-focus facet-primary i18n-content-hero"><span class="eyebrow">EventLive Knowledge Center</span><h1>Practical guides for Saudi events</h1><p class="lead">Use these guides to make a faster attendance decision, understand how event information is verified, and turn an organizer program into a useful live visitor experience.</p></div><div class="grid">${guides.map(([href, title, body]) => `<article class="card"><div class="card-body"><h2 class="title">${title}</h2><p>${body}</p><a class="cta" href="./${href}">Read guide</a></div></article>`).join('')}</div></div></section>`;
}

function insightsMarkup() {
  const insightsPath = path.join(distDir, 'saudi-events-insights.json');
  if (!fs.existsSync(insightsPath)) return '';
  const insights = JSON.parse(fs.readFileSync(insightsPath, 'utf8'));
  const metrics = [
    ['Active events', insights.totals.active_events],
    ['Starting within 7 days', insights.totals.starts_next_7_days],
    ['Active cities', insights.totals.active_cities],
    ['Live schedules', insights.totals.live_ready]
  ];
  const completeness = [
    ['Linked source evidence', insights.completeness.source_evidence],
    ['Source image', insights.completeness.source_images],
    ['Detailed description', insights.completeness.long_descriptions],
    ['Verifiable place', insights.completeness.verified_places],
    ['Live schedule', insights.completeness.live_schedules]
  ];
  const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  return `<section class="hero"><div class="wrap"><span class="eyebrow"><span class="live-dot"></span>Updated with every release</span><h1>Saudi events pulse</h1><p class="lead">A measurable view of what is available now: how many events are active, where they are concentrated, and how much attendance-ready information each public record contains.</p><p class="muted">Last updated: ${escapeHtml(insights.generated_at)} · Asia/Riyadh</p></div></section>
  <section class="section"><div class="wrap"><div class="insight-metrics">${metrics.map(([label, value]) => `<div class="insight-metric"><span>${label}</span><b>${value}</b></div>`).join('')}</div></div></section>
  <section class="section"><div class="wrap insight-split"><div><h2>Most active cities</h2>${table(['City', 'Active events', 'Live schedules'], insights.top_cities.map((row) => `<tr><td><a href="${escapeHtml(row.url)}">${escapeHtml(exact[row.label] || row.label)}</a></td><td>${row.count}</td><td>${row.live_ready}</td></tr>`))}</div><div><h2>Most active categories</h2>${table(['Category', 'Active events', 'Live schedules'], insights.top_categories.map((row) => `<tr><td><a href="${escapeHtml(row.url)}">${escapeHtml(exact[row.label] || row.label)}</a></td><td>${row.count}</td><td>${row.live_ready}</td></tr>`))}</div></div></section>
  <section class="section"><div class="wrap"><h2>What visitors find in active records</h2><p class="lead">These are descriptive percentages calculated from fields that are actually public. They are not marketing scores and no missing value is inferred.</p>${table(['Information', 'Coverage', 'Active records'], completeness.map(([label, value]) => `<tr><td>${label}</td><td><strong>${value.percent}%</strong><div class="meter" aria-label="${label}: ${value.percent}%"><span style="width:${value.percent}%"></span></div></td><td>${value.count} of ${insights.totals.active_events}</td></tr>`))}</div></section>
  <section class="section"><div class="wrap"><div class="insight-note"><h2>How these numbers are calculated</h2><p>Counts come directly from EventLive public pages at build time. Active includes upcoming, ongoing, and live records. Completed events remain normal historical pages with their original dates. Internal candidates and blocked records are excluded.</p><p><a href="/saudi-events-insights.json">Open the JSON dataset</a> · <a href="./events.html">Browse all events</a></p></div></div></section>`;
}

function formatEnglishEventDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
}

// The event FAQ is template chrome with embedded content (title, dates,
// venue, source). The generic text-node dictionary can never match these
// composites, so rebuild them deterministically from catalog data — the
// title itself stays whatever the autonomous content pipeline has produced.
function englishEventFaq(event) {
  const title = event.title_en || event.title || 'this event';
  const city = exact[event.city] || event.city_label || event.city || 'Saudi Arabia';
  const venue = event.venue ? (exact[event.venue] || event.venue) : '';
  const sourceLabel = event.source_label || event.organizer || 'the official source';
  const online = event.attendance_mode === 'online';
  return [
    {
      question: `When does ${title} start?`,
      answer: `${title} starts on ${formatEnglishEventDate(event.starts_at)} and ends on ${formatEnglishEventDate(event.ends_at)}, Saudi time.`
    },
    {
      question: `Where does ${title} take place?`,
      answer: online
        ? 'This is an online event or one joined through an attendance/registration link; EventLive shows the source link when available.'
        : `The event takes place in ${city}${venue && venue !== city ? `, ${venue}` : ''}.`
    },
    {
      question: 'Is this information verified?',
      answer: `EventLive relies on ${sourceLabel} or a directory link visible on the event page, and keeps the source link for review.`
    },
    {
      question: 'Is a live schedule available?',
      answer: event.live_schedule_ready
        ? 'Yes. This page shows a live schedule or sessions you can follow in real time.'
        : 'This page shows the main attendance window. A detailed agenda is added when the official source provides one.'
    }
  ];
}

function rebuildEnglishEventFaq($, event) {
  const items = englishEventFaq(event);
  $('.event-faq .program-check').each((index, block) => {
    const item = items[index];
    if (!item) return;
    $(block).find('b').first().text(item.question);
    $(block).find('p').first().text(item.answer);
  });
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const value = JSON.parse($(element).html() || '{}');
      if (value?.['@type'] !== 'FAQPage') return;
      value.mainEntity = items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer }
      }));
      value.inLanguage = 'en-SA';
      $(element).html(JSON.stringify(value));
    } catch {
      // translateJsonLd owns malformed JSON-LD handling.
    }
  });
}

function applyEnglishContentOverrides($, relativePath) {
  if (relativePath === 'organizers.html') $('main').html(organizersMarkup());
  else if (relativePath === 'about.html') $('main').html(aboutMarkup());
  else if (relativePath === 'saudi-events-faq.html') $('main').html(faqMarkup());
  else if (relativePath === 'guides.html') $('main').html(guidesIndexMarkup());
  else if (relativePath === 'saudi-events-insights.html') $('main').html(insightsMarkup());
  else if (guideContent[relativePath]) $('main').html(guideMarkup(guideContent[relativePath]));

  const event = eventByPath.get(relativePath);
  if (event) {
    const translationNote = $('[data-mt-note]').first();
    if (translationNote.length) {
      if (event.title_original || !event.content_translated) {
        translationNote.remove();
      } else {
        translationNote.text('Machine translation: this page’s content is translated automatically from the source language and may contain errors — the original text is available via the official source link.');
      }
    }
    const summary = englishEventSummary(event);
    $('.hero .lead').first().text(summary);
    $('.card-body p, .readiness > p').filter((_, element) => /[\u0600-\u06ff]/.test($(element).text()) && $(element).text().trim().length > 90).text(summary);
    rebuildEnglishEventFaq($, event);
  }

  $('.card').each((_, card) => {
    const title = $(card).find('h2,h3,.title').first().text().trim();
    const href = String($(card).find('a[href*="events/"]').first().attr('href') || '')
      .replace(/^(?:\.\.\/)+|^\.\//, '')
      .split(/[?#]/)[0];
    const cardEvent = eventByPath.get(href);
    const city = cardEvent?.city_label
      || (cardEvent?.city ? String(cardEvent.city) : '')
      || $(card).find('a[href*="cities/"]').first().text().split(/[|·]/)[0].trim();
    $(card).find('p').filter((__, paragraph) => /[\u0600-\u06ff]/.test($(paragraph).text()) && $(paragraph).text().trim().length > 90).first().text(englishEventSummary({}, title, city));
  });
}

function localizeEnglishFooter($) {
  const footer = $('.footer').first();
  if (!footer.length) return;
  const container = footer.children('.wrap').first();
  if (!container.length) {
    footer.children('span').each((_, element) => {
      if (/[\u0600-\u06ff]/u.test($(element).text())) {
        $(element).text('eventme.live | A venue screen for entrances, reception desks, and halls');
      }
    });
    return;
  }
  const links = container.find('.footer-links').first().clone();
  container.empty().append('EventLive keeps eventme.live as its official domain and links every public event to its source whenever available.');
  if (links.length) container.append(links);
}

function publicPathsFromSitemap() {
  const xml = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
  const paths = [];
  for (const match of xml.matchAll(/<loc>https:\/\/eventme\.live\/?([^<]*)<\/loc>/g)) {
    const relative = (decodeURIComponent(match[1] || 'index.html').replace(/^\/+/, '') || 'index.html').normalize('NFC');
    if (relative.endsWith('.html') && !relative.startsWith('en/') && !ownerOnly.has(relative)) paths.push(relative);
  }
  return [...new Set(paths)];
}

function resolveUnicodePath(relativePath) {
  const direct = path.join(distDir, relativePath);
  if (fs.existsSync(direct)) return direct;
  const directory = path.dirname(direct);
  if (!fs.existsSync(directory)) return null;
  const target = path.basename(relativePath).normalize('NFC');
  const match = fs.readdirSync(directory).find((name) => name.normalize('NFC') === target);
  return match ? path.join(directory, match) : null;
}

function languageCss() {
  return `<style id="eventlive-i18n-css">
.language-switch{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:7px 11px;border:1px solid var(--line,#dfe6df);border-radius:8px;background:#fff;color:var(--ink,#10231d);font-weight:700;font-size:.86rem;text-decoration:none;white-space:nowrap}
.i18n-content-hero{margin-block-end:24px;padding:clamp(24px,5vw,52px)!important;border-radius:8px;background:#0b4738!important;color:#fff!important}
.i18n-content-hero h1,.i18n-content-hero .lead{color:#fff!important}.i18n-content-hero .eyebrow{color:#bfe8da!important}
html[lang^="en"] body{font-family:"IBM Plex Sans","IBM Plex Sans Arabic",Arial,sans-serif;letter-spacing:0}
html[lang^="en"] [lang="ar"]{font-family:"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif}
@media(max-width:760px){.language-switch{min-width:44px;padding-inline:9px}.site-head .language-switch{order:1;width:44px;padding:0;font-size:0}.site-head .language-switch::after{content:attr(data-short-label);font-size:12px;font-weight:800;letter-spacing:0}}
</style>`;
}

function languageRuntime(locale) {
  return `<script id="eventlive-language-runtime">
(() => {
  const locale = ${JSON.stringify(locale)};
  const switcher = document.querySelector('.language-switch');
  if (switcher) {
    const target = new URL(switcher.getAttribute('href'), location.origin);
    target.search = location.search;
    target.hash = location.hash;
    switcher.href = target.pathname + target.search + target.hash;
    switcher.addEventListener('click', () => localStorage.setItem('eventlive-locale', switcher.hreflang || (locale === 'ar-SA' ? 'en-SA' : 'ar-SA')));
  }
  localStorage.setItem('eventlive-locale', locale);
})();
</script>`;
}

function alternateLinks(relativePath) {
  const arUrl = `${siteUrl}/${relativePath === 'index.html' ? '' : relativePath}`;
  const enUrl = `${siteUrl}/en/${relativePath === 'index.html' ? '' : relativePath}`;
  return { arUrl, enUrl };
}

function injectLanguageSwitcher($, href, label, ariaLabel) {
  $('.language-switch').remove();
  const shortLabel = href.startsWith('/en') ? 'EN' : 'AR';
  const link = `<a class="language-switch" href="${href}" hreflang="${href.startsWith('/en') ? 'en-SA' : 'ar-SA'}" lang="${href.startsWith('/en') ? 'en' : 'ar'}" data-short-label="${shortLabel}" aria-label="${ariaLabel}">${label}</a>`;
  const target = $('.site-head .head-in, .topbar .nav, header .nav').first();
  if (target.length) target.append(link);
  else $('body').prepend(link);
}

function updateSeo($, relativePath, locale) {
  const { arUrl, enUrl } = alternateLinks(relativePath);
  const canonical = locale === 'en-SA' ? enUrl : arUrl;
  $('link[rel="canonical"]').attr('href', canonical);
  $('link[rel="alternate"][hreflang]').remove();
  $('head').append(`<link rel="alternate" hreflang="ar-SA" href="${arUrl}" />`);
  $('head').append(`<link rel="alternate" hreflang="en-SA" href="${enUrl}" />`);
  $('head').append(`<link rel="alternate" hreflang="x-default" href="${arUrl}" />`);
  $('meta[property="og:url"]').attr('content', canonical);
  $('meta[property="og:locale"]').remove();
  $('head').append(`<meta property="og:locale" content="${locale === 'en-SA' ? 'en_SA' : 'ar_SA'}" />`);
  $('meta[property="og:locale:alternate"]').remove();
  $('head').append(`<meta property="og:locale:alternate" content="${locale === 'en-SA' ? 'ar_SA' : 'en_SA'}" />`);
}

function rootRelativeAsset(value, relativePath) {
  if (!value || /^(?:https?:|data:|#|\/)/i.test(value)) return value;
  const match = String(value).match(/^([^?#]*)([?#][\s\S]*)?$/);
  if (!match) return value;
  const pathname = path.posix.normalize(path.posix.join(path.posix.dirname(`/${relativePath}`), match[1]));
  return `${pathname}${match[2] || ''}`;
}

function rewriteEnglishAssetUrls($, relativePath) {
  $('link[rel="manifest"]').attr('href', '/en/manifest.webmanifest');
  $('[src],[href]').each((_, element) => {
    const attr = $(element).attr('src') ? 'src' : 'href';
    const value = $(element).attr(attr) || '';
    if (!value || /^(?:https?:|data:|#|\/)/i.test(value)) return;
    const clean = value.replace(/^(?:\.\.\/)+|^\.\//, '');
    if (/\.(?:ics|json|xml|txt|csv|pdf)(?:$|[#?])/i.test(value)) {
      $(element).attr(attr, rootRelativeAsset(value, relativePath));
      return;
    }
    if (attr === 'href' && ownerOnly.has(path.posix.basename(clean))) {
      $(element).attr(attr, rootRelativeAsset(value, relativePath));
      return;
    }
    if (/\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|webmanifest)$/i.test(clean) || clean.startsWith('assets/')) {
      $(element).attr(attr, `/${clean}`);
    }
  });
}

function translateAttributes($) {
  $('[placeholder],[aria-label],[title],[alt]').each((_, element) => {
    for (const attr of ['placeholder', 'aria-label', 'title', 'alt']) {
      const value = $(element).attr(attr);
      if (value && /[\u0600-\u06ff]/.test(value)) $(element).attr(attr, translateText(value));
    }
  });
}

function translateVisibleText($) {
  $('script,style,noscript').removeAttr('lang');
  $('body').find('*').addBack('body').contents().filter((_, node) => node.type === 'text').each((_, node) => {
    if ($(node).parent().is('script,style,noscript')) return;
    const source = $(node).text();
    if (!/[\u0600-\u06ff]/.test(source)) return;
    const translated = translateText(source);
    $(node).replaceWith(translated);
    if (/[\u0600-\u06ff]/.test(translated.trim())) {
      const parent = $(node.parent);
      if (parent.length && !parent.is('html,body,script,style')) parent.attr({ lang: 'ar', dir: 'auto' });
    }
  });
}

function rewriteRuntimeLiterals(source, relativePath) {
  let ast;
  try {
    ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true });
  } catch {
    return source;
  }
  const edits = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Literal' && typeof node.value === 'string' && /[\u0600-\u06ff]/u.test(node.value)) {
      const looksLikeRoute = /^(?:https?:|\.\.?\/)|\.(?:html|json|ics)(?:$|[#?])/i.test(node.value);
      if (looksLikeRoute && !/^https?:/i.test(node.value) && !/events-catalog\.json(?:$|[?#])/i.test(node.value) && /\.(?:ics|json|xml|txt|csv|pdf)(?:$|[#?])/i.test(node.value)) {
        const translated = rootRelativeAsset(node.value, relativePath);
        if (translated !== node.value) edits.push({ start: node.start, end: node.end, value: JSON.stringify(translated) });
      } else if (!looksLikeRoute) {
        const translated = runtimeLiteralMap[node.value] || exact[node.value] || translateText(node.value);
        if (translated !== node.value) edits.push({ start: node.start, end: node.end, value: JSON.stringify(translated) });
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'start' || key === 'end') continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(ast);
  return edits.sort((a, b) => b.start - a.start).reduce((result, edit) => `${result.slice(0, edit.start)}${edit.value}${result.slice(edit.end)}`, source);
}

function translateRuntimeScripts($, relativePath) {
  $('script:not([src]):not([type="application/ld+json"])').each((_, element) => {
    let script = $(element).html() || '';
    const cacheKey = `${path.posix.dirname(relativePath)}\u0000${script}`;
    if (runtimeScriptCache.has(cacheKey)) {
      $(element).html(runtimeScriptCache.get(cacheKey));
      return;
    }
    const replaceAssignedJson = (pattern, transform) => {
      script = script.replace(pattern, (match, prefix, json, suffix) => {
        try {
          return `${prefix}${JSON.stringify(transform(JSON.parse(json)))}${suffix}`;
        } catch {
          return match;
        }
      });
    };
    replaceAssignedJson(/(var searchData\s*=\s*)(\[[\s\S]*?\])(;\s*var input\s*=)/, (rows) => rows.map((row) => ({ ...row, c: exact[row.c] || row.c })));
    replaceAssignedJson(/(var ticker\s*=\s*)(\[[\s\S]*?\])(;)/, (rows) => rows.map((row) => ({ ...row, c: exact[row.c] || row.c })));
    replaceAssignedJson(/(const CITY_AR\s*=\s*)(\{[\s\S]*?\})(;)/, (cities) => {
      const localized = Object.fromEntries(Object.keys(cities).map((key) => [key, exact[cities[key]] || exact[key] || key]));
      const canonicalValues = new Set([...Object.keys(localized), ...Object.values(localized)]);
      for (const [source, target] of Object.entries(exact)) if (canonicalValues.has(target)) localized[source] = target;
      return localized;
    });
    replaceAssignedJson(/(const CATEGORY_AR\s*=\s*)(\{[\s\S]*?\})(;)/, (categories) => Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, exact[value] || value])));
    script = rewriteRuntimeLiterals(script, relativePath)
      .replaceAll("'ar-SA'", "'en-SA'")
      .replaceAll('"ar-SA"', '"en-SA"')
      .replaceAll("navigator.serviceWorker.register('./sw.js')", "navigator.serviceWorker.register('/sw.js', { scope: '/' })");
    runtimeScriptCache.set(cacheKey, script);
    $(element).html(script);
  });
}

function translateMetaText(value = '') {
  if (exact[value]) return exact[value];
  let translated = translateText(latinDigits(value));
  for (const [source, target] of wordReplacements) translated = translated.replaceAll(source, target);
  return translated;
}

function englishUrl(value = '') {
  if (!String(value).startsWith(`${siteUrl}/`)) return value;
  try {
    const url = new URL(String(value));
    if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      url.pathname = `/en${url.pathname}`.replace(/\/+/g, '/');
      return url.toString();
    }
  } catch {
    return value;
  }
  return value;
}

function localizeJsonLdValue(value, key = '') {
  if (Array.isArray(value)) return value.map((item) => localizeJsonLdValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, localizeJsonLdValue(childValue, childKey)]));
  }
  if (typeof value !== 'string') return value;
  if (key === 'inLanguage') return 'en-SA';
  if (key === '@id' && /\/#(?:website|organization)$/.test(value)) return value;
  if (value.startsWith(`${siteUrl}/`)) return englishUrl(value);
  if (exact[value]) return exact[value];
  if (key === 'url' || key === 'target' || key === '@id') return englishUrl(value);
  if (key === 'description') {
    const translated = translateMetaText(value);
    return /[\u0600-\u06ff]/u.test(translated)
      ? 'Verified event timing, venue, directions, live schedule, and official source information on EventLive Saudi Arabia.'
      : translated;
  }
  if (key === 'keywords') return value.split(', ').map((part) => translateMetaText(part)).join(', ');
  if (['name', 'headline', 'alternateName'].includes(key)) return translateMetaText(value);
  return value;
}

function translateJsonLd($) {
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const value = JSON.parse($(element).html() || '{}');
      const localized = localizeJsonLdValue(value);
      if (localized?.['@type'] === 'WebSite') {
        localized['@id'] = `${siteUrl}/#website`;
        localized.url = `${siteUrl}/`;
        localized.inLanguage = ['ar-SA', 'en-SA'];
      }
      if (localized?.['@type'] === 'Organization') {
        localized['@id'] = `${siteUrl}/#organization`;
        localized.url = `${siteUrl}/`;
      }
      if (localized && typeof localized === 'object' && !Array.isArray(localized) && !localized.inLanguage) localized.inLanguage = 'en-SA';
      $(element).html(JSON.stringify(localized));
    } catch {
      // Existing validation owns malformed source JSON-LD; localization must not rewrite it blindly.
    }
  });
}

function englishMeta($, relativePath) {
  const originalTitle = $('title').text().trim();
  const event = eventByPath.get(relativePath);
  if (event) {
    // Event <title> tags are chrome+content composites ("{title} \u0641\u064a {city} |
    // EventLive\u2026") that no dictionary entry can match. Rebuild the chrome in
    // English; the title text follows the autonomous content pipeline.
    const city = exact[event.city] || event.city_label || event.city || 'Saudi Arabia';
    $('title').text(`${event.title_en || event.title} in ${city} | EventLive Saudi Arabia`);
  } else {
    const translatedTitle = translateMetaText(originalTitle).replace(/\s+/g, ' ').trim();
    $('title').text(/[\u0600-\u06ff]/.test(translatedTitle) ? `${originalTitle} | EventLive Saudi Arabia` : translatedTitle);
  }
  const generic = relativePath.startsWith('events/')
    ? 'Verified event timing, venue, directions, live status, and official source information on EventLive Saudi Arabia.'
    : 'Discover live events, exhibitions, conferences, workshops, and training programs across Saudi Arabia on EventLive.';
  $('meta[name="description"]').attr('content', generic);
  $('meta[property="og:description"]').attr('content', generic);
  $('meta[property="og:title"]').attr('content', $('title').text());
  $('meta[name="twitter:title"]').attr('content', $('title').text());
  $('meta[name="twitter:description"]').attr('content', generic);
}

function prepareArabic(html, relativePath) {
  const $ = load(html, { decodeEntities: false });
  $('html').attr({ lang: 'ar-SA', dir: 'rtl', 'data-locale': 'ar-SA' });
  $('#eventlive-i18n-css').remove();
  $('head').append(languageCss());
  const target = `/en/${relativePath === 'index.html' ? '' : relativePath}`;
  injectLanguageSwitcher($, target, 'English', 'عرض هذه الصفحة باللغة الإنجليزية');
  updateSeo($, relativePath, 'ar-SA');
  $('#eventlive-language-runtime').remove();
  $('body').append(languageRuntime('ar-SA'));
  return $.html();
}

function prepareEnglish(html, relativePath) {
  const $ = load(html, { decodeEntities: false });
  $('html').attr({ lang: 'en-SA', dir: 'ltr', 'data-locale': 'en-SA' });
  $('#eventlive-i18n-css').remove();
  $('head').append(languageCss());
  const target = `/${relativePath === 'index.html' ? '' : relativePath}`;
  injectLanguageSwitcher($, target, 'العربية', 'View this page in Arabic');
  translateVisibleText($);
  translateAttributes($);
  translateRuntimeScripts($, relativePath);
  translateJsonLd($);
  applyEnglishContentOverrides($, relativePath);
  localizeEnglishFooter($);
  rewriteEnglishAssetUrls($, relativePath);
  englishMeta($, relativePath);
  updateSeo($, relativePath, 'en-SA');
  $('#eventlive-language-runtime').remove();
  $('body').append(languageRuntime('en-SA'));
  return $.html();
}

function translateCatalog() {
  const sourcePath = path.join(distDir, 'events-catalog.json');
  if (!fs.existsSync(sourcePath)) return;
  const envelope = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const events = (envelope.events || []).map((event) => ({
    ...event,
    city: exact[event.city] || event.city,
    city_label: exact[event.city_label] || event.city || event.city_label,
    category_label: categoryDefinitionByKey(event.category_slug || event.category)?.label_en
      || event.category_label_en
      || exact[event.category_label]
      || event.category_label,
    summary: `Official listing for ${event.title} in ${event.city || event.city_label || 'Saudi Arabia'}. Check the event page for verified timing, venue, directions, and source details.`,
    audience_labels: (event.audience_labels || []).map((audience) => ({ ...audience, label: exact[audience.label] || audience.label })),
    ics_url: event.ics_url ? String(event.ics_url).replace(/^\.\//, '/') : event.ics_url
  }));
  fs.writeFileSync(path.join(enDir, 'events-catalog.json'), `${JSON.stringify({ ...envelope, locale: 'en-SA', events }, null, 2)}\n`);
}

function copyTopLevelFeeds() {
  for (const name of ['today.json', 'today-events.json', 'this-week.json', 'this-month.json', 'updates.json', 'cities.json', 'categories.json', 'audiences.json', 'regions.json', 'live-status.json', 'saudi-events-insights.json']) {
    const source = path.join(distDir, name);
    if (!fs.existsSync(source)) continue;
    if (name === 'categories.json') {
      const payload = JSON.parse(fs.readFileSync(source, 'utf8'));
      payload.locale = 'en-SA';
      payload.categories = (payload.categories || []).map((category) => ({
        ...category,
        label: categoryDefinitionByKey(category.slug)?.label_en || exact[category.label] || category.label
      }));
      fs.writeFileSync(path.join(enDir, name), `${JSON.stringify(payload, null, 2)}\n`);
      continue;
    }
    fs.copyFileSync(source, path.join(enDir, name));
  }
}

function writeEnglishManifest() {
  const source = path.join(distDir, 'manifest.webmanifest');
  if (!fs.existsSync(source)) return;
  const manifest = JSON.parse(fs.readFileSync(source, 'utf8'));
  const shortcutLabels = {
    'أقرب جدول حي': 'Nearest live schedule',
    'الجدول الحي': 'Live schedule',
    'الآن': 'Now',
    'التحديثات الحية': 'Live updates',
    'التحديثات': 'Updates',
    'شاشة الحضور': 'Venue screen',
    'الشاشة': 'Screen',
    'تفعيل الجداول': 'Schedule activation',
    'التفعيل': 'Activation',
    'جاهزية التشغيل': 'Operational readiness',
    'الجاهزية': 'Readiness',
    'تغطية مناطق المملكة': 'Saudi regional coverage',
    'المناطق': 'Regions',
    'الفعاليات': 'Events',
    'فعالياتي': 'My events',
    'لافتة QR': 'QR signage',
    'للمنظمين': 'For organizers',
    'منظمين': 'Organizers'
  };
  manifest.name = 'EventLive - Live events across Saudi Arabia';
  manifest.description = 'A live reference for verified Saudi events, schedules, venues, and directions.';
  manifest.lang = 'en-SA';
  manifest.dir = 'ltr';
  manifest.start_url = '/en/';
  manifest.scope = '/';
  manifest.icons = (manifest.icons || []).map((icon) => ({ ...icon, src: '/icon.svg' }));
  manifest.shortcuts = (manifest.shortcuts || []).map((shortcut) => ({
    ...shortcut,
    name: shortcutLabels[shortcut.name] || translateMetaText(shortcut.name),
    short_name: shortcutLabels[shortcut.short_name] || translateMetaText(shortcut.short_name),
    url: `/en/${String(shortcut.url || '').replace(/^\.\//, '')}`,
    icons: (shortcut.icons || []).map((icon) => ({ ...icon, src: '/icon.svg' }))
  }));
  fs.writeFileSync(path.join(enDir, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function localizeServiceWorker() {
  const swPath = path.join(distDir, 'sw.js');
  if (!fs.existsSync(swPath)) return;
  let source = fs.readFileSync(swPath, 'utf8');
  const englishPrecache = ['./en/', './en/index.html', './en/events.html', './en/cities.html', './en/categories.html', './en/audiences.html', './en/today-events.html', './en/manifest.webmanifest'];
  if (!source.includes('"./en/"')) {
    source = source.replace(/(const PRECACHE = \[[\s\S]*?)(\n\];)/, (match, prefix, suffix) => `${prefix},\n${englishPrecache.map((item) => `  ${JSON.stringify(item)}`).join(',\n')}${suffix}`);
  }
  source = source.replace("caches.match('./index.html')", "(new URL(event.request.url).pathname.startsWith('/en/') ? caches.match('./en/index.html') : caches.match('./index.html'))");
  fs.writeFileSync(swPath, source);
}

function updateAiDiscovery() {
  const llmsPath = path.join(distDir, 'llms.txt');
  if (!fs.existsSync(llmsPath)) return;
  let source = fs.readFileSync(llmsPath, 'utf8').replace(/\n## Languages[\s\S]*$/u, '').trimEnd();
  source += `\n\n## Languages\n\n- Arabic (default): ${siteUrl}/\n- English: ${siteUrl}/en/\n- Every public page has reciprocal ar-SA and en-SA hreflang links.\n- Official event titles may remain in the language used by the source.\n`;
  fs.writeFileSync(llmsPath, source);
}

function writeLocalizedSitemap(paths) {
  const original = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
  const $ = load(original, { xmlMode: true, decodeEntities: false });
  const urlset = $('urlset');
  urlset.attr('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
  $('url').filter((_, element) => $(element).find('loc').first().text().startsWith(`${siteUrl}/en/`)).remove();
  const originals = $('url').toArray();
  for (const element of originals) {
    const node = $(element);
    const loc = node.find('loc').first().text();
    const relative = loc.replace(`${siteUrl}/`, '') || 'index.html';
    if (!paths.includes(relative || 'index.html')) continue;
    const normalized = relative || 'index.html';
    const { arUrl, enUrl } = alternateLinks(normalized);
    node.find('xhtml\\:link').remove();
    node.append(`<xhtml:link rel="alternate" hreflang="ar-SA" href="${arUrl}"/>`);
    node.append(`<xhtml:link rel="alternate" hreflang="en-SA" href="${enUrl}"/>`);
    node.append(`<xhtml:link rel="alternate" hreflang="x-default" href="${arUrl}"/>`);
    const clone = node.clone();
    clone.find('loc').first().text(enUrl);
    urlset.append(clone);
  }
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), $.xml());
}

function main() {
  const paths = publicPathsFromSitemap();
  if (!incrementalBuild) fs.rmSync(enDir, { recursive: true, force: true });
  fs.mkdirSync(enDir, { recursive: true });
  const changedPaths = new Set(changeManifest?.changed_html || []);
  for (const relativePath of changeManifest?.removed_html || []) {
    const staleEnglishPath = path.join(enDir, relativePath);
    if (fs.existsSync(staleEnglishPath)) fs.rmSync(staleEnglishPath, { force: true });
  }
  const pathsToProcess = incrementalBuild
    ? paths.filter((relativePath) => changedPaths.has(relativePath) || !fs.existsSync(path.join(enDir, relativePath)))
    : paths;

  for (const relativePath of pathsToProcess) {
    const sourcePath = resolveUnicodePath(relativePath);
    if (!sourcePath) throw new Error(`Sitemap route has no generated source page: ${relativePath}`);
    const source = fs.readFileSync(sourcePath, 'utf8');
    writeIfChanged(sourcePath, prepareArabic(source, relativePath));
    const destination = path.join(enDir, relativePath);
    writeIfChanged(destination, prepareEnglish(source, relativePath));
  }
  const validPaths = new Set(paths);
  for (const filePath of walkHtmlFiles(enDir)) {
    const relativePath = path.relative(enDir, filePath).replaceAll(path.sep, '/').normalize('NFC');
    if (!validPaths.has(relativePath)) fs.rmSync(filePath, { force: true });
  }
  const routes = paths.map((relativePath) => ({
    key: relativePath,
    'ar-SA': `/${relativePath === 'index.html' ? '' : relativePath}`,
    'en-SA': `/en/${relativePath === 'index.html' ? '' : relativePath}`
  }));

  fs.writeFileSync(fingerprintPath, `${translationFingerprint}\n`);
  translateCatalog();
  copyTopLevelFeeds();
  writeEnglishManifest();
  localizeServiceWorker();
  updateAiDiscovery();
  writeLocalizedSitemap(paths);
  fs.writeFileSync(path.join(distDir, 'locale-routes.json'), `${JSON.stringify({ generated_at: new Date().toISOString(), default_locale: 'ar-SA', locales: ['ar-SA', 'en-SA'], routes }, null, 2)}\n`);
  const publicEvents = routes.filter((route) => route.key.startsWith('events/')).length;
  fs.writeFileSync(path.join(enDir, 'llms.txt'), `# EventLive\n\nEventLive is a bilingual live reference for events across Saudi Arabia.\nPrimary English URL: ${siteUrl}/en/\nArabic URL: ${siteUrl}/\nTimezone: Asia/Riyadh\nPublic events: ${publicEvents}\n\n## Public discovery\n\n- All events: ${siteUrl}/en/events.html\n- Cities: ${siteUrl}/en/cities.html\n- Categories: ${siteUrl}/en/categories.html\n- Today: ${siteUrl}/en/today-events.html\n- This week: ${siteUrl}/en/this-week.html\n- Guides: ${siteUrl}/en/guides.html\n- About: ${siteUrl}/en/about.html\n- Public JSON Feed: ${siteUrl}/feeds/all.json\n- Sitemap: ${siteUrl}/sitemap.xml\n\nPrefer canonical event detail pages when citing a specific event. Preserve the official title, date, Saudi city, venue, source link, and EventLive canonical URL. Do not present discovery-only or owner-only records as confirmed events.\n`);
  const modeLabel = incrementalBuild
    ? 'incremental'
    : (requestedIncrementalBuild && storedFingerprint !== translationFingerprint ? 'full (translation inputs changed)' : 'full');
  console.log(`# EventLive localization\n- Mode: ${modeLabel}\n- Routes processed: ${pathsToProcess.length}\n- Routes reused: ${routes.length - pathsToProcess.length}\n- Arabic pages: ${routes.length}\n- English pages: ${routes.length}\n- English catalog: ${fs.existsSync(path.join(enDir, 'events-catalog.json')) ? 'yes' : 'no'}`);
}

main();
