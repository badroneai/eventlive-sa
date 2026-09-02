import fs from 'node:fs';
import path from 'node:path';
import { assignEventCategory, categoryLabels, normalizeEventCategoryMetadata } from './category-taxonomy.mjs';
import { stripSourceAttribution, withSourceAttribution } from './source-attribution-utils.mjs';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const reportJsonPath = path.join(root, 'reports', 'saudi-water-authority-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'saudi-water-authority-enrichment-report.md');
const generatedAt = new Date().toISOString();
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_SWA_TIMEOUT_MS || 15000));
const limit = Math.max(1, Number(process.env.EVENTLIVE_SWA_LIMIT || 50));

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function cleanText(value = '') {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactItems(items, limit = 8, maxLength = 320) {
  const seen = new Set();
  return items
    .map((item) => cleanText(item))
    .filter(Boolean)
    .map((item) => (item.length > maxLength ? `${item.slice(0, maxLength - 3)}...` : item))
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function firstSentence(text = '') {
  const cleaned = cleanText(text);
  if (!cleaned) return '';
  const sentence = cleaned.split(/(?<=[.!؟])\s+/)[0] || cleaned;
  return sentence.length > 260 ? `${sentence.slice(0, 257)}...` : sentence;
}

function decodeHtml(value = '') {
  return cleanText(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'");
}

function extractMeta(html, name) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)`, 'i');
  return decodeHtml(html.match(pattern)?.[1] || '');
}

function extractCalendarParams(html) {
  const href = html.match(/href=["']([^"']*calendar\.google\.com\/calendar\/render\?[^"']+)["']/i)?.[1];
  if (!href) return {};
  try {
    const params = new URL(decodeHtml(href)).searchParams;
    return {
      title: decodeHtml(params.get('text') || ''),
      details: decodeHtml(params.get('details') || ''),
      location: decodeHtml(params.get('location') || ''),
      dates: decodeHtml(params.get('dates') || '')
    };
  } catch {
    return {};
  }
}

function extractOfficialImage(html) {
  const matches = [...String(html || '').matchAll(/https?:\/\/[^"'<>\\\s]*swa-cdn\.swa\.gov\.sa\/Events\/[^"'<>\\\s]+\.(?:png|jpe?g|webp)/gi)]
    .map((match) => match[0])
    .filter((value, index, values) => value && values.indexOf(value) === index);
  return matches[0] || '';
}

function shortDate(value = '') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function durationText(event = {}) {
  const start = shortDate(event.starts_at);
  const end = shortDate(event.ends_at);
  if (start && end && start !== end) return `${start} إلى ${end}`;
  return start || end || '';
}

function isSwaSourceUrl(value = '') {
  return /https?:\/\/(?:www\.)?swa\.gov\.sa\//i.test(cleanText(value));
}

function preferOfficialSwaUrl(event = {}, candidate = {}) {
  const eventCandidateUrl = cleanText(candidate.source_url || candidate.evidence_url || '');
  if (isSwaSourceUrl(eventCandidateUrl)) return eventCandidateUrl;
  const eventSourceUrl = cleanText(event.source_url || event.evidence_url || '');
  if (isSwaSourceUrl(eventSourceUrl)) return eventSourceUrl;
  return eventCandidateUrl || eventSourceUrl;
}

function hasOfficialSwaImage(value = '') {
  return /swa-cdn\.swa\.gov\.sa\/Events\//i.test(cleanText(value));
}

async function fetchSwaPage(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en,ar;q=0.8',
      'user-agent': 'Mozilla/5.0 (compatible; EventLiveSourceEnricher/1.0; +https://eventme.live)'
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  return {
    title: extractMeta(html, 'og:title') || cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''),
    description: extractMeta(html, 'og:description') || extractMeta(html, 'description'),
    image: extractOfficialImage(html),
    calendar: extractCalendarParams(html)
  };
}

function findCandidate(event, candidatesByEventId, candidatesByKey) {
  if (event.id && candidatesByEventId.has(event.id)) return candidatesByEventId.get(event.id);
  const key = `${cleanText(event.title).toLowerCase()}|${event.starts_at || ''}`;
  return candidatesByKey.get(key) || {};
}

function applySwaDetails(event, candidate = {}, page = {}) {
  const calendar = page.calendar || {};
  const title = cleanText(page.title || calendar.title || candidate.title || event.title);
  const officialDescription = stripSourceAttribution(cleanText(page.description || calendar.details || candidate.summary || event.summary));
  const organizer = cleanText(event.organizer || candidate.organizer || 'Saudi Water Authority');
  const venue = cleanText(calendar.location || event.venue || candidate.venue || event.city || candidate.city);
  const city = cleanText(event.city || candidate.city || venue);
  const category = cleanText(event.raw_category || candidate.category || event.category || 'event');
  const sourceUrl = preferOfficialSwaUrl(event, candidate);
  const windowText = durationText(candidate.starts_at ? candidate : event);
  const pageImage = cleanText(page.image || '');
  const catalogImage = cleanText(event.image_url || '');
  const candidateImage = cleanText(candidate.image_url || '');
  const imageUrl = hasOfficialSwaImage(pageImage)
    ? pageImage
    : (hasOfficialSwaImage(catalogImage)
      ? catalogImage
      : (hasOfficialSwaImage(candidateImage) ? candidateImage : ''));

  if (sourceUrl) {
    event.source_url = sourceUrl;
    event.evidence_url = event.evidence_url || sourceUrl;
  }
  if (imageUrl) {
    event.original_image_url = event.original_image_url || imageUrl;
    event.image_alt = event.image_alt || `${event.title} - Saudi Water Authority`;
    event.image_discovery_method = page.image ? 'img' : 'catalog-candidate';
    event.image_discovered_at = generatedAt;
  }

  if (title) event.title = title;
  event.organizer = organizer;
  event.venue = venue;
  event.city = city;
  assignEventCategory(event, category);
  const categoryLabel = categoryLabels(event.category, event)?.ar;
  event.description = officialDescription;
  event.rich_summary = officialDescription;
  event.summary = withSourceAttribution(firstSentence(officialDescription), 'الهيئة السعودية للمياه');
  event.image_url = imageUrl;
  event.image_source_url = sourceUrl || event.image_source_url || '';
  event.highlights = compactItems([
    ...(Array.isArray(event.highlights) ? event.highlights : []),
    `الموعد الرسمي: ${windowText}`,
    `الموقع: ${venue}`,
    `المنظم: ${organizer}`,
    `التصنيف: ${categoryLabel}`,
    imageUrl ? 'الصورة الرسمية محفوظة من CDN الهيئة السعودية للمياه.' : ''
  ], 8, 240);
  event.program_outline = {
    provider: 'Saudi Water Authority',
    source_method: page.title ? 'official-page-html' : 'approved-calendar-row',
    source_url: sourceUrl,
    collected_at: generatedAt,
    official_description: officialDescription,
    duration_text: windowText,
    registration_deadline: cleanText(event.registration_deadline || ''),
    goals: compactItems([
      'تقديم بطاقة حضور موثقة من صفحة الهيئة السعودية للمياه الرسمية.',
      'توضيح موعد الفعالية وموقعها والجهة المنظمة للزائر قبل الحضور.',
      'إثراء فعاليات قطاع المياه والاستدامة ضمن كتالوج EventLive الوطني.'
    ], 6, 240),
    features: compactItems([
      `الفعالية: ${event.title}`,
      `النافذة الزمنية: ${windowText}`,
      `الموقع: ${venue}`,
      `المدينة: ${city}`,
      `المنظم: ${organizer}`,
      `التصنيف: ${categoryLabel}`,
      imageUrl ? `الصورة الرسمية: ${imageUrl}` : '',
      calendar.dates ? `Google Calendar dates: ${calendar.dates}` : ''
    ], 8, 280),
    requirements: compactItems([
      'راجع صفحة الهيئة الرسمية قبل الحضور لاحتمال تحديث القاعة أو ساعات الدخول.',
      'استخدم EventLive لمتابعة العد التنازلي وحالة الفعالية عند اقتراب الموعد.'
    ], 4, 240),
    faqs: Object.fromEntries(Object.entries({
      source_scope: 'Saudi Water Authority official event page',
      organizer,
      venue,
      city,
      category: categoryLabel,
      calendar_location: calendar.location || '',
      live_schedule_status: 'Event-level official page only; no timed session agenda was published in the extracted page.'
    }).filter(([, value]) => value))
  };
  event.richness_score = Math.max(Number(event.richness_score || 0), imageUrl ? 10 : 8);
  event.updated_at = generatedAt;
  normalizeEventCategoryMetadata(event);
  return { imageUrl, fetched: Boolean(page.title), sourceMethod: event.program_outline.source_method };
}

const catalog = readJson(catalogPath, { events: [] });
const candidates = readJson(candidatesPath, { candidates: [] }).candidates || [];
const events = Array.isArray(catalog.events) ? catalog.events : [];
const swaCandidates = candidates.filter((candidate) => candidate.source_label === 'Saudi Water Authority Events');
const candidatesByEventId = new Map(swaCandidates.map((candidate) => [candidate.matched_catalog_event_id, candidate]));
const candidatesByKey = new Map(swaCandidates.map((candidate) => [`${cleanText(candidate.title).toLowerCase()}|${candidate.starts_at || ''}`, candidate]));
const targets = events.filter((event) => event.source_label === 'Saudi Water Authority Events').slice(0, limit);

const enriched = [];
const failed = [];

for (const event of targets) {
  const candidate = findCandidate(event, candidatesByEventId, candidatesByKey);
  const sourceUrl = preferOfficialSwaUrl(event, candidate);
  let page = {};
  try {
    if (sourceUrl) page = await fetchSwaPage(sourceUrl);
  } catch (error) {
    failed.push({ id: event.id, title: event.title, source_url: event.source_url, reason: String(error.message || error) });
  }
  const result = applySwaDetails(event, candidate, page);
  enriched.push({
    id: event.id,
    title: event.title,
    source_method: result.sourceMethod,
    image_url: result.imageUrl || '',
    fetched: result.fetched,
    features: event.program_outline.features.length
  });
}

catalog.generated_for = catalog.generated_for || 'EventLive Saudi events catalog';
catalog.notes = catalog.notes || 'Auto-published official and approved-source Saudi events.';
writeJson(catalogPath, catalog);

const report = {
  generated_at: generatedAt,
  catalog: path.relative(root, catalogPath),
  source: 'Saudi Water Authority Events',
  totals: {
    targets: targets.length,
    candidates: swaCandidates.length,
    enriched: enriched.length,
    fetched: enriched.filter((item) => item.fetched).length,
    images: enriched.filter((item) => item.image_url).length,
    fetch_failures: failed.length
  },
  enriched,
  failed
};
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# Saudi Water Authority Enrichment Report',
  '',
  `- generated_at: ${generatedAt}`,
  `- targets: ${report.totals.targets}`,
  `- candidates: ${report.totals.candidates}`,
  `- enriched: ${report.totals.enriched}`,
  `- fetched: ${report.totals.fetched}`,
  `- images: ${report.totals.images}`,
  `- fetch_failures: ${report.totals.fetch_failures}`,
  '',
  '## Enriched',
  '',
  ...(enriched.length
    ? enriched.map((item) => `- ${item.title} - ${item.source_method} - image=${item.image_url ? 'yes' : 'no'} - features=${item.features}`)
    : ['- none']),
  '',
  '## Fetch Failures',
  '',
  ...(failed.length ? failed.map((item) => `- ${item.title} - ${item.reason}`) : ['- none'])
].join('\n') + '\n', 'utf8');

console.log('# EventLive Saudi Water Authority Enrichment');
console.log(`- Targets: ${report.totals.targets}`);
console.log(`- Enriched: ${report.totals.enriched}`);
console.log(`- Fetched: ${report.totals.fetched}`);
console.log(`- Images: ${report.totals.images}`);
console.log(`- Fetch failures: ${report.totals.fetch_failures}`);
console.log(`- Report: ${path.relative(root, reportMdPath)}`);
