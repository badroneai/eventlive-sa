import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const eventsJsonPath = path.join(distDir, 'events.json');

assert.equal(fs.existsSync(eventsJsonPath), true, 'dist/events.json must exist; run npm run build first');

const eventsIndex = JSON.parse(fs.readFileSync(eventsJsonPath, 'utf8'));
const events = Array.isArray(eventsIndex.events) ? eventsIndex.events : [];
assert.ok(events.length > 0, 'events.json must include events');

const samples = [
  events.find((event) => event.live_schedule_ready),
  events.find((event) => event.schedule_quality === 'basic-window' && event.detail_url),
  events.find((event) => !event.live_schedule_ready && event.detail_url),
  events.find((event) => event.status === 'ended' && !event.live_schedule_ready && event.detail_url),
  events.find((event) => isOnlineEvent(event) && event.detail_url)
].filter(Boolean).filter((event, index, list) => list.findIndex((item) => item.id === event.id) === index);

assert.ok(samples.length >= 1, 'must have at least one event detail sample');

function jsonLdScripts(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
}

function publicUrl(value = '') {
  const text = String(value || '');
  if (/^https?:\/\//i.test(text)) return text;
  return `https://eventme.live/${text.replace(/^\.\//, '').replace(/^\//, '')}`;
}

function metaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const propertyMatch = html.match(new RegExp(`<meta\\s+property="${escaped}"\\s+content="([^"]+)"\\s*/?>`, 'i'));
  const nameMatch = html.match(new RegExp(`<meta\\s+name="${escaped}"\\s+content="([^"]+)"\\s*/?>`, 'i'));
  return (propertyMatch?.[1] || nameMatch?.[1] || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function isOnlineEvent(event = {}) {
  const text = [
    event.city,
    event.city_label,
    event.venue,
    event.venue_address,
    event.training_delivery,
    event.delivery_mode,
    event.attendance_mode
  ].filter(Boolean).join(' ');
  return /\bOnline\b|عن بعد|افتراضي|افتراضية|تفاعلية مباشرة|أونلاين|اونلاين/i.test(text);
}

for (const event of samples) {
  const detailPath = path.join(distDir, event.detail_url.replace(/^\.\//, ''));
  assert.equal(fs.existsSync(detailPath), true, `${event.detail_url} must be generated`);

  const html = fs.readFileSync(detailPath, 'utf8');
  const charsetCount = (html.match(/<meta charset="UTF-8"\s*\/?>/gi) || []).length;
  assert.equal(charsetCount, 1, `${event.detail_url} must include exactly one charset meta tag`);

  assert.match(html, /aria-label="معلومات الحضور"/, `${event.detail_url} must include public attendance information`);
  assert.match(html, /ما تحتاجه قبل الذهاب/, `${event.detail_url} must explain the visitor value of the attendance panel`);
  assert.match(html, /نوع الحضور/, `${event.detail_url} must show the attendance type`);
  assert.match(html, /تفاصيل البرنامج/, `${event.detail_url} must show public schedule availability`);
  assert.doesNotMatch(html, /درجة جاهزية الحضور|\d+\/8/, `${event.detail_url} must not expose an internal readiness score`);
  assert.match(html, /جدول حي/, `${event.detail_url} must show live schedule readiness signal`);
  assert.doesNotMatch(html, /href="\.\/events\/[^"]+\.ics"/, `${event.detail_url} must not link to a nested events/events calendar path`);
  assert.match(html, /href="\.\/[^"]+\.ics"/, `${event.detail_url} must link to its sibling calendar file`);
  for (const rawTag of ['bootcamps', 'accelerators', 'incubators', 'ended-event', 'open', 'gaming', 'technology']) {
    const rawVisiblePattern = new RegExp(`>\\s*${rawTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<`, 'i');
    assert.doesNotMatch(html, rawVisiblePattern, `${event.detail_url} must not expose raw tag "${rawTag}" as visible chip text`);
  }
  if (event.status === 'ended' && !event.live_schedule_ready) {
    assert.doesNotMatch(html, />\s*تفعيل الجدول الحي\s*</, `${event.detail_url} must not ask visitors to activate a live schedule after the event ended`);
    assert.match(html, /اكتملت هذه الفعالية|فعالية مكتملة محفوظة/, `${event.detail_url} must explain ended events as retained records`);
  }

  const attendanceFactCount = (html.match(/class="attendance-fact"/g) || []).length;
  assert.equal(attendanceFactCount, 4, `${event.detail_url} must render four visitor-facing attendance facts`);
  const faqPosition = html.indexOf('class="section event-faq"');
  assert.ok(faqPosition > html.indexOf('aria-label="معلومات الحضور"'), `${event.detail_url} visitor FAQ must follow attendance essentials`);
  assert.ok(faqPosition < html.indexOf('</main>'), `${event.detail_url} visitor FAQ must remain the final section in the main content`);
  if (html.includes('data-event-agenda')) {
    assert.ok(faqPosition > html.indexOf('data-event-agenda'), `${event.detail_url} visitor FAQ must follow the live agenda`);
  }

  const ld = jsonLdScripts(html);
  const eventLd = ld.find((item) => item['@type'] === 'Event');
  const breadcrumbLd = ld.find((item) => item['@type'] === 'BreadcrumbList');
  assert.ok(eventLd, `${event.detail_url} must include Event JSON-LD`);
  assert.ok(breadcrumbLd, `${event.detail_url} must include BreadcrumbList JSON-LD`);
  assert.equal(breadcrumbLd.itemListElement?.length, 4, `${event.detail_url} breadcrumb must include home, catalog, category, and event`);
  assert.equal(breadcrumbLd.itemListElement?.[0]?.name, 'EventLive', `${event.detail_url} breadcrumb must start with EventLive`);
  assert.equal(breadcrumbLd.itemListElement?.[1]?.item, 'https://eventme.live/events.html', `${event.detail_url} breadcrumb must include all events page`);
  assert.equal(breadcrumbLd.itemListElement?.[3]?.item, `https://eventme.live/${event.detail_url.replace(/^\.\//, '')}`, `${event.detail_url} breadcrumb must end at the current canonical page`);
  assert.match(html, /aria-label="مسار التنقل"/, `${event.detail_url} must include a visible breadcrumb`);
  assert.equal(eventLd.url, `https://eventme.live/${event.detail_url.replace(/^\.\//, '')}`, `${event.detail_url} must keep eventme.live canonical URL`);
  assert.ok(eventLd.mainEntityOfPage?.startsWith('https://eventme.live/'), `${event.detail_url} must have canonical mainEntityOfPage`);
  const expectedImage = publicUrl(event.image_url);
  assert.deepEqual(eventLd.image, [expectedImage], `${event.detail_url} must expose its event image in Event JSON-LD`);
  assert.equal(metaContent(html, 'og:type'), 'event', `${event.detail_url} must expose event OpenGraph type`);
  assert.equal(metaContent(html, 'og:url'), `https://eventme.live/${event.detail_url.replace(/^\.\//, '')}`, `${event.detail_url} must expose canonical OpenGraph URL`);
  assert.equal(metaContent(html, 'og:locale'), 'ar_SA', `${event.detail_url} must expose Arabic Saudi OpenGraph locale`);
  assert.equal(metaContent(html, 'og:image'), expectedImage, `${event.detail_url} must expose its event image in OpenGraph`);
  assert.ok(metaContent(html, 'og:image:alt').length > 0, `${event.detail_url} must expose OpenGraph image alt text`);
  assert.equal(metaContent(html, 'twitter:card'), 'summary_large_image', `${event.detail_url} must expose a large Twitter/X preview card`);
  assert.ok(metaContent(html, 'twitter:title').includes(event.title), `${event.detail_url} must expose Twitter/X title`);
  assert.ok(metaContent(html, 'twitter:description').length >= 80, `${event.detail_url} must expose Twitter/X description`);
  assert.equal(metaContent(html, 'twitter:image'), expectedImage, `${event.detail_url} must expose its event image for social previews`);
  assert.ok(metaContent(html, 'twitter:image:alt').length > 0, `${event.detail_url} must expose Twitter/X image alt text`);
  assert.equal(metaContent(html, 'theme-color'), '#0d6b52', `${event.detail_url} must expose EventLive theme color`);
  if (isOnlineEvent(event)) {
    assert.equal(eventLd.eventAttendanceMode, 'https://schema.org/OnlineEventAttendanceMode', `${event.detail_url} must use OnlineEventAttendanceMode`);
    assert.equal(eventLd.location?.['@type'], 'VirtualLocation', `${event.detail_url} must use VirtualLocation for online events`);
    assert.ok(eventLd.location?.url?.startsWith('http'), `${event.detail_url} online location must include a public URL`);
    assert.doesNotMatch(html, />\s*الاتجاهات\s*</, `${event.detail_url} must not show map directions for online events`);
    assert.doesNotMatch(html, /google\.com\/maps\/dir/i, `${event.detail_url} must not link to Google Maps directions for online events`);
    assert.match(html, />\s*الدخول أو التسجيل\s*</, `${event.detail_url} must expose a useful online attendance action`);
  } else {
    assert.equal(eventLd.eventAttendanceMode, 'https://schema.org/OfflineEventAttendanceMode', `${event.detail_url} must use OfflineEventAttendanceMode`);
    assert.equal(eventLd.location?.['@type'], 'Place', `${event.detail_url} must use Place for in-person events`);
    assert.equal(eventLd.location?.address?.['@type'], 'PostalAddress', `${event.detail_url} must use structured PostalAddress data`);
    assert.equal(eventLd.location?.address?.addressCountry, 'SA', `${event.detail_url} must identify Saudi Arabia as the address country`);
    assert.ok(eventLd.location?.address?.addressLocality, `${event.detail_url} must expose the event city as addressLocality`);
  }
  const officialSessions = (event.sessions || []).filter((session) => !['attendance-window', 'opening-hours'].includes(session.session_type)
    && session.source !== 'event-start-end'
    && session.inferred !== true);
  if (officialSessions.length) {
    assert.ok(Array.isArray(eventLd.subEvent), `${event.detail_url} live schedules must expose subEvent JSON-LD`);
    assert.equal(eventLd.subEvent.length, Math.min(20, officialSessions.length), `${event.detail_url} subEvent count must include official sessions only`);
    for (const subEvent of eventLd.subEvent) {
      assert.equal(subEvent['@type'], 'Event', `${event.detail_url} each subEvent must be an Event`);
      assert.ok(subEvent.url?.startsWith(`https://eventme.live/${event.detail_url.replace(/^\.\//, '')}#session-`), `${event.detail_url} subEvent URLs must point to visible session anchors`);
      const anchor = subEvent.url.split('#')[1];
      assert.match(html, new RegExp(`id="${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), `${event.detail_url} must render a matching session anchor for ${anchor}`);
    }
  } else {
    assert.equal(eventLd.subEvent, undefined, `${event.detail_url} must not claim subEvents for attendance windows or opening hours`);
  }
  if (event.schedule_quality === 'basic-window') {
    assert.equal(event.live_schedule_ready, false, `${event.detail_url} basic attendance windows must not inflate live_schedule_ready`);
    assert.match(html, />\s*نافذة الحضور\s*</, `${event.detail_url} must label inferred schedules as an attendance window`);
    assert.match(html, /نافذة حضور أساسية مستنتجة/, `${event.detail_url} must explain inferred attendance windows`);
    assert.ok(event.attendance_window_ready, `${event.detail_url} must expose attendance_window_ready`);
    assert.equal(event.attendance_window?.session_type, 'attendance-window', `${event.detail_url} must expose structured attendance window metadata`);
    assert.equal(eventLd.subEvent, undefined, `${event.detail_url} attendance windows must never become Google subEvents`);
  }
}

console.log('event-detail-page-regression-test: ok');
