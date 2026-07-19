import fs from 'node:fs';
import path from 'node:path';
import { assignEventCategory, categoryLabels, normalizeEventCategoryMetadata } from './category-taxonomy.mjs';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const reportJsonPath = path.join(root, 'reports', 'rfecc-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'rfecc-enrichment-report.md');
const generatedAt = new Date().toISOString();
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_RFECC_TIMEOUT_MS || 15000));
const limit = Math.max(1, Number(process.env.EVENTLIVE_RFECC_LIMIT || 50));

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
    .replace(/&amp;|&#038;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactItems(items, limit = 8, maxLength = 300) {
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

function extractMeta(html, name) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)`, 'i');
  return cleanText(html.match(pattern)?.[1] || '');
}

function extractOfficialImage(html) {
  const metaImage = extractMeta(html, 'og:image');
  if (/cdn\.rfecc\.sa/i.test(metaImage)) return metaImage;
  return [...String(html || '').matchAll(/https?:\/\/cdn\.rfecc\.sa\/[^"'<>\\\s]+\.(?:png|jpe?g|webp)/gi)]
    .map((match) => match[0])
    .filter((value) => !/\/qr_/i.test(value))[0] || '';
}

function extractJsonLdEvent(html) {
  const blocks = [...String(html || '').matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(cleanText(block[1]));
      const graph = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed];
      const event = graph.find((item) => item?.['@type'] === 'Event' || (Array.isArray(item?.['@type']) && item['@type'].includes('Event')));
      if (event) return event;
    } catch {
      // Keep scanning other blocks; WordPress plugins can emit multiple JSON-LD blobs.
    }
  }
  return {};
}

function stripHtml(value = '') {
  return cleanText(String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
}

function extractDateLine(html) {
  const text = stripHtml(html);
  return cleanText(text.match(/Date\s+([A-Z][a-z]{2}\s+\d{2}\s+\d{4}\s+-\s+[A-Z][a-z]{2}\s+\d{2}\s+\d{4})/)?.[1] || '');
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

function isRfeccSourceUrl(value = '') {
  return /https?:\/\/(?:www\.)?rfecc\.sa\//i.test(cleanText(value));
}

function preferOfficialRfeccUrl(event = {}, candidate = {}) {
  const candidateSource = cleanText(candidate.source_url || candidate.evidence_url || '');
  if (isRfeccSourceUrl(candidateSource)) return candidateSource;
  const eventSource = cleanText(event.source_url || event.evidence_url || '');
  return isRfeccSourceUrl(eventSource) ? eventSource : candidateSource || eventSource;
}

function hasOfficialRfeccImage(value = '') {
  return /cdn\.rfecc\.sa\//i.test(cleanText(value));
}

async function fetchRfeccPage(url) {
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
  const jsonLdEvent = extractJsonLdEvent(html);
  const title = cleanText(extractMeta(html, 'og:title') || jsonLdEvent.name || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  return {
    title: title.replace(/\s+-\s+RFECC Riyadh Front Exhibition.*$/i, ''),
    description: cleanText(extractMeta(html, 'og:description') || jsonLdEvent.description || ''),
    image: extractOfficialImage(html),
    date_line: extractDateLine(html),
    schema_status: cleanText(jsonLdEvent.eventStatus || ''),
    attendance_mode: cleanText(jsonLdEvent.eventAttendanceMode || '')
  };
}

function findCandidate(event, candidatesByEventId, candidatesByKey) {
  if (event.id && candidatesByEventId.has(event.id)) return candidatesByEventId.get(event.id);
  const key = `${cleanText(event.title).toLowerCase()}|${event.starts_at || ''}`;
  return candidatesByKey.get(key) || {};
}

function applyRfeccDetails(event, candidate = {}, page = {}) {
  const officialTitle = cleanText(page.title || candidate.title || event.title);
  const venue = cleanText(event.venue || candidate.venue || 'Riyadh Front Exhibition & Conference Center');
  const city = cleanText(event.city || candidate.city || 'Riyadh');
  const category = cleanText(event.raw_category || candidate.category || event.category || 'exhibition');
  const organizer = cleanText(event.organizer || candidate.organizer || 'Riyadh Front Exhibition & Conference Center');
  const sourceUrl = preferOfficialRfeccUrl(event, candidate);
  const windowText = durationText(candidate.starts_at ? candidate : event);
  const pageImage = cleanText(page.image || '');
  const catalogImage = cleanText(event.image_url || '');
  const candidateImage = cleanText(candidate.image_url || '');
  const imageUrl = hasOfficialRfeccImage(pageImage)
    ? pageImage
    : (hasOfficialRfeccImage(catalogImage)
      ? catalogImage
      : (hasOfficialRfeccImage(candidateImage) ? candidateImage : ''));
  if (sourceUrl) {
    event.source_url = sourceUrl;
    event.evidence_url = event.evidence_url || sourceUrl;
  }
  const officialDescription = cleanText(page.description || candidate.summary || event.summary || `Official listing for ${officialTitle} at ${venue}.`);

  if (officialTitle) event.title = officialTitle;
  event.image_url = imageUrl;
  event.organizer = organizer;
  event.venue = venue;
  event.city = city;
  assignEventCategory(event, category);
  const categoryLabel = categoryLabels(event.category, event)?.ar;
  event.description = officialDescription;
  event.rich_summary = officialDescription;
  event.summary = `${officialDescription} المصدر الرسمي: واجهة الرياض للمعارض والمؤتمرات.`;
  if (imageUrl) {
    event.original_image_url = event.original_image_url || imageUrl;
    event.image_alt = event.image_alt || `${event.title} - RFECC`;
    event.image_source_url = sourceUrl;
    event.image_discovered_at = generatedAt;
    event.image_discovery_method = page.image ? 'meta' : 'catalog-candidate';
  }
  event.highlights = compactItems([
    ...(Array.isArray(event.highlights) ? event.highlights : []),
    `الموعد الرسمي: ${windowText}`,
    page.date_line ? `تاريخ صفحة RFECC: ${page.date_line}` : '',
    `الموقع: ${venue}`,
    `المنظم: ${organizer}`,
    imageUrl ? 'الصورة الرسمية محفوظة من CDN واجهة الرياض.' : ''
  ], 8, 240);
  event.program_outline = {
    provider: 'RFECC What’s On',
    source_method: page.title ? 'official-page-html-jsonld' : 'approved-calendar-row',
    source_url: sourceUrl,
    collected_at: generatedAt,
    official_description: officialDescription,
    duration_text: windowText,
    registration_deadline: cleanText(event.registration_deadline || ''),
    goals: compactItems([
      'تقديم بطاقة حضور موثقة من صفحة واجهة الرياض الرسمية.',
      'توضيح موعد المعرض وموقعه قبل انتقال الزائر إلى مركز المعارض.',
      'توسيع تغطية EventLive للمعارض التجارية والقطاعية في الرياض.'
    ], 6, 240),
    features: compactItems([
      `الفعالية: ${event.title}`,
      `النافذة الزمنية: ${windowText}`,
      page.date_line ? `تاريخ صفحة RFECC: ${page.date_line}` : '',
      `الموقع: ${venue}`,
      `المدينة: ${city}`,
      `التصنيف: ${categoryLabel}`,
      imageUrl ? `الصورة الرسمية: ${imageUrl}` : '',
      page.schema_status ? `Schema status: ${page.schema_status}` : ''
    ], 8, 280),
    requirements: compactItems([
      'راجع صفحة RFECC الرسمية قبل الحضور لاحتمال تحديث ساعات الدخول أو القاعة.',
      'استخدم EventLive لمتابعة العد التنازلي وحالة الفعالية عند اقتراب الموعد.'
    ], 4, 240),
    faqs: Object.fromEntries(Object.entries({
      source_scope: 'RFECC official event page with WordPress event metadata',
      organizer,
      venue,
      city,
      category: categoryLabel,
      attendance_mode: page.attendance_mode || '',
      live_schedule_status: 'Event-level official page only; no timed session agenda was published in the extracted page.'
    }).filter(([, value]) => value))
  };
  event.richness_score = Math.max(Number(event.richness_score || 0), imageUrl ? 9 : 7);
  event.updated_at = generatedAt;
  normalizeEventCategoryMetadata(event);
  return { imageUrl, fetched: Boolean(page.title), sourceMethod: event.program_outline.source_method };
}

const catalog = readJson(catalogPath, { events: [] });
const candidates = readJson(candidatesPath, { candidates: [] }).candidates || [];
const events = Array.isArray(catalog.events) ? catalog.events : [];
const rfeccCandidates = candidates.filter((candidate) => candidate.source_label === "RFECC What's On");
const candidatesByEventId = new Map(rfeccCandidates.map((candidate) => [candidate.matched_catalog_event_id, candidate]));
const candidatesByKey = new Map(rfeccCandidates.map((candidate) => [`${cleanText(candidate.title).toLowerCase()}|${candidate.starts_at || ''}`, candidate]));
const targets = events.filter((event) => event.source_label === "RFECC What's On").slice(0, limit);

const enriched = [];
const failed = [];

for (const event of targets) {
  const candidate = findCandidate(event, candidatesByEventId, candidatesByKey);
  const sourceUrl = preferOfficialRfeccUrl(event, candidate);
  let page = {};
  try {
    if (sourceUrl) page = await fetchRfeccPage(sourceUrl);
  } catch (error) {
    failed.push({ id: event.id, title: event.title, source_url: event.source_url, reason: String(error.message || error) });
  }
  const result = applyRfeccDetails(event, candidate, page);
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
  source: "RFECC What's On",
  totals: {
    targets: targets.length,
    candidates: rfeccCandidates.length,
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
  '# RFECC Enrichment Report',
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

console.log('# EventLive RFECC Enrichment');
console.log(`- Targets: ${report.totals.targets}`);
console.log(`- Enriched: ${report.totals.enriched}`);
console.log(`- Fetched: ${report.totals.fetched}`);
console.log(`- Images: ${report.totals.images}`);
console.log(`- Fetch failures: ${report.totals.fetch_failures}`);
console.log(`- Report: ${path.relative(root, reportMdPath)}`);
