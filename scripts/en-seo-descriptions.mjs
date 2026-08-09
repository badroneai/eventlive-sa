// English meta descriptions for the non-event surface.
//
// Every English page used to ship one of two constant sentences (see
// englishMeta() in generate-localized-site.mjs). Google had nothing
// page-specific to index or display for half the site, and 98 chrome pages —
// the home page, the guides, every city and category landing page — were
// mutually indistinguishable in the SERP.
//
// Event pages are rebuilt from catalog data. Everything else is covered here,
// in two layers:
//
//  1. TEMPLATED PAGES (city / audience / category facets) are rebuilt from
//     their Arabic template by matching the template and translating only the
//     label. New cities and categories are picked up automatically — nothing
//     to maintain per page.
//  2. AUTHORED PAGES have hand-written Arabic copy that no dictionary entry
//     can derive. Their English text is authored here, keyed by the Arabic
//     sentence, so the pair stays visible in one place and a drifted Arabic
//     description falls back rather than shipping a wrong translation.
//
// The Arabic keys are the description BEFORE seoDescription()'s padding
// suffix is appended; the suffix is translated separately below.

export const AR_SEO_SUFFIX = 'EventLive يعرض الوقت الحي، المدينة، الموقع، المصدر، روابط التقويم والاتجاهات لتجربة حضور أوضح في فعاليات السعودية.';
export const EN_SEO_SUFFIX = 'EventLive shows live timing, city, venue, source, calendar links, and directions for a clearer way to attend events in Saudi Arabia.';

// Layer 1 — facet templates. Each entry matches the Arabic description of a
// generated facet page and rebuilds it in English around the translated label.
const FACET_TEMPLATES = [
  {
    pattern: /^فعاليات (.+) القادمة والجارية والمنتهية كما تظهر في EventLive مع مصدر ووقت واضح\.$/u,
    build: (label) => `Upcoming, ongoing, and completed events in ${label} as published on EventLive, each with a clear source and time.`
  },
  {
    pattern: /^(.+) في EventLive مع الفعاليات القادمة والجارية والمنتهية ومصدر كل فعالية\.$/u,
    build: (label) => `${label} on EventLive: upcoming, ongoing, and completed events, each with its own source.`
  },
  {
    pattern: /^(.+) في السعودية مع وقت الفعالية ومكانها ومصدرها وحالة الجدول الحي\.$/u,
    build: (label) => `${label} in Saudi Arabia, with event time, venue, source, and live schedule status.`
  }
];

// Layer 2 — authored pages, keyed by their Arabic description.
const AUTHORED = new Map([
  ['تعرف على EventLive، مرجع فعاليات السعودية الحي الذي يجمع المواعيد والمدن والمواقع والجداول من مصادر قابلة للفحص ويتجدد دوريًا.',
    'Meet EventLive, the live reference for events in Saudi Arabia — dates, cities, venues, and schedules gathered from checkable sources and refreshed on a regular cycle.'],
  ['دليل EventLive لاكتشاف فعاليات السعودية حسب الجمهور: طلاب، باحثون عن عمل، تقنيون، عائلات، رواد أعمال، مهنيون، مبدعون، رياضة وغيرها مع تقويم لكل فئة.',
    'The EventLive guide to finding Saudi events by audience: students, job seekers, tech professionals, families, founders, professionals, creatives, sports and more, each with its own calendar.'],
  ['دليل EventLive لتصنيفات فعاليات السعودية: تدريب تقني، مؤتمرات، معارض، رياضة، ترفيه عائلي، جامعات ومجتمع، وغرف تجارية مع تقويم لكل تصنيف.',
    'The EventLive guide to Saudi event categories: technical training, conferences, exhibitions, sports, family entertainment, universities and community, and chambers of commerce, each with its own calendar.'],
  ['دليل EventLive لفعاليات مدن السعودية: الرياض، جدة، مكة، العلا، الظهران، أبها، جازان، بريدة، وغيرها مع أعداد الفعاليات القادمة والمنتهية والجداول الحية.',
    'The EventLive guide to events across Saudi cities: Riyadh, Jeddah, Makkah, AlUla, Dhahran, Abha, Jazan, Buraydah and more, with upcoming and completed event counts and live schedules.'],
  ['اكتشف فعاليات السعودية عبر EventLive وافتح الجداول الحية، صفحات التفاصيل، QR، والاتجاهات من مكان واحد.',
    'Browse events across Saudi Arabia on EventLive and open live schedules, detail pages, QR codes, and directions from one place.'],
  ['صفحة للفعاليات والدورات والبرامج التي تظهر كمجانية أو بدون رسوم في بيانات EventLive، مع رابط المصدر والتوقيت.',
    'Events, courses, and programmes that appear as free or no-fee in EventLive data, each with its source link and timing.'],
  ['شرح سبب إبقاء الفعاليات المنتهية في EventLive كجزء من المرجع العام للمدن والمواسم والجهات، وليس كأرشيف منفصل مخفي.',
    'Why EventLive keeps completed events as part of the public record of cities, seasons, and organizers rather than hiding them in a separate archive.'],
  ['كيف يجمع EventLive الفعاليات من المصادر الرسمية والشركاء، وكيف يفصل بين الاكتشاف والنشر العام حتى تبقى المنصة موثوقة.',
    'How EventLive collects events from official sources and partners, and how it separates discovery from public publishing to keep the platform trustworthy.'],
  ['دليل سريع لاستخدام EventLive أثناء الطريق إلى الفعالية وداخل المكان: الحالة الحية، العد التنازلي، القادم، الاتجاهات، والحفظ في سجل فعالياتي.',
    'A quick guide to using EventLive on the way to an event and once you are there: live status, countdown, what is next, directions, and saving it to My Events.'],
  ['طريقة استخدام EventLive لاكتشاف الدورات التقنية، المعسكرات، والبرامج الأونلاين من مصادر سعودية موثوقة مثل طويق ومهارات المستقبل وCODE.',
    'How to use EventLive to find technical courses, bootcamps, and online programmes from trusted Saudi sources such as Tuwaiq, Future Skills, and CODE.'],
  ['ما الذي تحتاجه الجهة المنظمة لتحويل برنامج الفعالية إلى صفحة EventLive حية قابلة للمشاركة والـQR والتحديث أثناء الحدث.',
    'What an organizer needs to turn an event programme into a live EventLive page that can be shared, opened by QR, and updated during the event.'],
  ['كيف تساعد EventLive زائر الرياض على معرفة الفعاليات القادمة والجارية، أماكنها، توقيتها، والجدول الحي عندما يكون متاحًا.',
    'How EventLive helps a visitor in Riyadh see which events are upcoming and ongoing, where they are, when they run, and the live schedule when one is available.'],
  ['شرح لبنية بيانات EventLive وكيف تساعد المستخدمين ومحركات البحث والذكاءات على فهم الفعاليات والمدن والتصنيفات والمصادر.',
    'How EventLive structures its data so people, search engines, and AI assistants can understand its events, cities, categories, and sources.'],
  ['كيف يستخدم الزائر EventLive لمتابعة فعاليات الصيف القادمة والجارية في الرياض، جدة، عسير، العلا، وبقية مناطق المملكة.',
    'How to use EventLive to follow upcoming and ongoing summer events in Riyadh, Jeddah, Aseer, AlUla, and the rest of the Kingdom.'],
  ['ماذا يحدث الآن في السعودية؟ فعاليات ودورات وملتقيات بجداول حية وعدّ تنازلي، من مصادر رسمية موثوقة، في كل مدن المملكة.',
    'What is happening right now in Saudi Arabia: events, courses, and forums with live schedules and countdowns, from trusted official sources, across every city in the Kingdom.'],
  ['دليل فعاليات جدة القادمة على EventLive، مع التاريخ والموقع والتصنيف وروابط المصدر والتقويم.',
    'A guide to upcoming events in Jeddah on EventLive, with dates, venues, categories, and source and calendar links.'],
  ['سجل فعالياتك المحفوظة محلياً على EventLive مع تصدير تقويم وروابط مباشرة.',
    'Your own list of events saved locally on EventLive, with calendar export and direct links.'],
  ['نموذج EventLive المنظم لإضافة فعالية أو جدول حي من جهة منظمة مع مصدر اعتماد واضح وبيانات وقت ومكان وجلسات قابلة للنشر على eventme.live.',
    "EventLive's organizer form for submitting an event or live schedule with a clear approval source and publishable time, venue, and session details for eventme.live."],
  ['حوّل برنامج فعاليتك إلى جدول حي موثوق عبر EventLive مع رابط للزوار وQR وتحديثات مباشرة وتحقق واعتماد وحزمة مشاركة.',
    'Turn your event programme into a trusted live schedule on EventLive, with a visitor link, QR code, live updates, verification and approval, and a sharing pack.'],
  ['نسخة طباعة عامة لأي فعالية في EventLive تعرض الوقت الحي، الموقع، المصدر، الجلسات وروابط الحضور بدون الاعتماد على ملفات تسليم قديمة.',
    'A public print view for any EventLive event showing live timing, venue, source, sessions, and attendance links without depending on stale handover files.'],
  ['سياسة EventLive لقياس الاستخدام وحماية بيانات الزوار والمنظمين على eventme.live.',
    "EventLive's policy on measuring usage and protecting visitor and organizer data on eventme.live."],
  ['أقرب فعاليات الرياض على EventLive: مؤتمرات، معارض، ورش، دورات وفعاليات عامة مع المصدر والوقت الحي.',
    'The nearest events in Riyadh on EventLive: conferences, exhibitions, workshops, courses, and public events with their source and live timing.'],
  ['إجابات مختصرة للباحثين والزوار والذكاءات عن طريقة العثور على فعاليات السعودية، التحقق من المصدر، الجداول الحية، والفعاليات المنتهية.',
    'Short answers for searchers, visitors, and AI assistants on how to find Saudi events, verify the source, read live schedules, and use completed events.'],
  ['مؤشرات حية عن الفعاليات النشطة والمدن والجداول وجودة معلومات الحضور في السعودية، محدثة مع كل دورة نشر.',
    'Live indicators on active events, cities, schedules, and the quality of attendance information across Saudi Arabia, refreshed with every publishing cycle.'],
  ['أقرب فعاليات نهاية الأسبوع في السعودية على EventLive، مناسبة لمن يبحث عن فعاليات الجمعة والسبت مع وقت حي ومصدر واضح.',
    'The nearest weekend events in Saudi Arabia on EventLive, for anyone looking for Friday and Saturday plans with live timing and a clear source.'],
  ['شاشة عرض حية من EventLive تعرض أولوية الآن، القادم، ورمز QR للزوار داخل الفعالية.',
    'A live display screen from EventLive showing what is on now, what is next, and a QR code for visitors inside the venue.'],
  ['صفحة مشاركة EventLive العامة لأي فعالية موثوقة مع رابط مباشر وواتساب وتقويم ومصدر، وتعمل تلقائيًا من معرف الفعالية في الرابط.',
    "EventLive's public share page for any verified event, with a direct link, WhatsApp, calendar, and source, resolved automatically from the event id in the URL."],
  ['لافتة QR حديثة من EventLive للاستخدام في مداخل الفعاليات والشاشات، تعرض اسم الفعالية والوقت الحي ورابطها الرسمي.',
    'A modern EventLive QR sign for event entrances and screens, showing the event name, its live timing, and its official link.'],
  ['منهج EventLive في جلب الفعاليات من المصادر الرسمية وشبه الرسمية دون تجاوز الحماية أو النشر من مصادر اكتشافية.',
    "EventLive's approach to collecting events from official and semi-official sources without bypassing protections or publishing from discovery-only sources."],
  ['شروط استخدام EventLive كموقع مرجعي للفعاليات الحية في السعودية.',
    'The terms for using EventLive as a reference site for live events in Saudi Arabia.'],
  ['فعاليات هذا الشهر في السعودية من EventLive، مرتبة من الأقرب زمنيا مع روابط التفاصيل والتقويم والمصدر.',
    "This month's events across Saudi Arabia on EventLive, ordered by what is soonest, with detail, calendar, and source links."],
  ['جدول الأحداث القادمة في الأسبوع القادم، مرتبة زمنيا مع تفاصيل الوقت والمدينة والمصدر.',
    'The schedule of events coming up in the week ahead, in time order, with timing, city, and source details.'],
  ['وضع الحضور في EventLive: أقرب فعالية محفوظة أو مباشرة، العد التنازلي، الرابط الحي، الاتجاهات، والتقويم.',
    'Attendance mode on EventLive: your nearest saved or live event, the countdown, the live link, directions, and the calendar.'],
  ['مركز تحديثات EventLive الحية للتغييرات المهمة أثناء الفعاليات: الوصول، تغيير القاعات، التنبيهات، والتحديثات المرتبطة بالجلسات.',
    "EventLive's hub for live updates that matter during an event: access, hall changes, alerts, and session-linked updates."],
  ['الويكند على EventLive: فعاليات السعودية مع حالة مباشرة وروابط تقويم واتجاهات.',
    'The weekend on EventLive: events across Saudi Arabia with live status, calendar links, and directions.']
]);

// --- Titles ------------------------------------------------------------
//
// Same two layers, applied to <title>. Before this existed, 65 English pages
// shipped an Arabic title — including EVERY English city landing page, the one
// an English searcher reaches for "events in Riyadh" — and 47 of them also
// carried the brand twice ("… | EventLive | EventLive Saudi Arabia"), because
// the fallback appended the English brand to a title that already ended in the
// Arabic one.

const EN_BRAND_SUFFIX = 'EventLive Saudi Arabia';

const TITLE_TEMPLATES = [
  {
    pattern: /^فعاليات (.+?)\s*\|\s*EventLive$/u,
    build: (label) => (/^(?:online|virtual|remote)$/i.test(label) ? 'Online Events' : `Events in ${label}`)
  }
];

const AUTHORED_TITLES = new Map([
  ['EventLive | لماذا يعرض EventLive الفعاليات المنتهية؟', 'Why EventLive Shows Completed Events'],
  ['EventLive | منهجية مصادر EventLive والتحقق', 'EventLive Source and Verification Methodology'],
  ['EventLive | دليل الدورات التقنية والأونلاين في السعودية', 'Guide to Technical and Online Courses in Saudi Arabia'],
  ['EventLive | دليل المنظمين لتحويل الفعالية إلى جدول حي', "Organizer's Guide: Turning an Event into a Live Schedule"],
  ['EventLive | دليل فعاليات الرياض الحية عبر EventLive', 'Guide to Live Riyadh Events on EventLive'],
  ['EventLive | دليل بيانات الفعاليات السعودية في EventLive', 'Guide to Saudi Event Data on EventLive'],
  ['EventLive | دليل فعاليات الصيف في مناطق السعودية', 'Guide to Summer Events Across Saudi Regions'],
  ['EventLive | فعاليات الويكند', 'Weekend Events']
]);

/**
 * English <title> for a non-event page.
 * @returns {string} the full English title, or '' when neither layer applies
 */
export function englishSeoTitle(title = '', translateLabel = (value) => value) {
  const value = String(title).replace(/\s+/g, ' ').trim();
  if (!value) return '';

  const authored = AUTHORED_TITLES.get(value);
  if (authored) return `${authored} | ${EN_BRAND_SUFFIX}`;

  for (const { pattern, build } of TITLE_TEMPLATES) {
    const match = value.match(pattern);
    if (!match) continue;
    const label = translateLabel(match[1]).replace(/\s+/g, ' ').trim();
    if (!label || /[؀-ۿ]/u.test(label)) return '';
    return `${build(label)} | ${EN_BRAND_SUFFIX}`;
  }
  return '';
}

/**
 * Appends the English brand exactly once. A title that already ends in the
 * Arabic brand ("… | EventLive") gets that suffix replaced, not stacked.
 */
export function withEnglishBrand(title = '') {
  const value = String(title).replace(/\s+/g, ' ').trim();
  if (!value) return EN_BRAND_SUFFIX;
  if (value.endsWith(EN_BRAND_SUFFIX)) return value;
  return `${value.replace(/\s*\|\s*EventLive$/u, '')} | ${EN_BRAND_SUFFIX}`;
}

/**
 * Splits the padding suffix off an Arabic meta description.
 * @returns {{head: string, padded: boolean}}
 */
export function splitSeoSuffix(description = '') {
  const value = String(description).replace(/\s+/g, ' ').trim();
  if (!value.endsWith(AR_SEO_SUFFIX)) return { head: value, padded: false };
  return { head: value.slice(0, -AR_SEO_SUFFIX.length).trim(), padded: true };
}

/**
 * English description for a non-event page.
 *
 * @param {string} description the built Arabic meta description
 * @param {(value: string) => string} translateLabel translator for a facet label
 * @returns {string} the English description, or '' when neither layer applies
 */
export function englishSeoDescription(description = '', translateLabel = (value) => value) {
  const { head, padded } = splitSeoSuffix(description);
  if (!head) return '';
  const suffix = padded ? ` ${EN_SEO_SUFFIX}` : '';

  const authored = AUTHORED.get(head);
  if (authored) return `${authored}${suffix}`;

  for (const { pattern, build } of FACET_TEMPLATES) {
    const match = head.match(pattern);
    if (!match) continue;
    const label = translateLabel(match[1]).replace(/\s+/g, ' ').trim();
    // A label the dictionary could not translate would ship Arabic inside an
    // English sentence — worse than falling through to the generic line.
    if (!label || /[؀-ۿ]/u.test(label)) return '';
    return `${build(label)}${suffix}`;
  }
  return '';
}
