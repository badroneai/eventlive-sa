import fs from 'node:fs';
import path from 'node:path';
import { assignEventCategory, categoryLabels, normalizeEventCategoryMetadata } from './category-taxonomy.mjs';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const reportJsonPath = path.join(root, 'reports', 'visit-saudi-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'visit-saudi-enrichment-report.md');
const generatedAt = new Date().toISOString();
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_VISIT_SAUDI_TIMEOUT_MS || 12000));
const limit = Math.max(1, Number(process.env.EVENTLIVE_VISIT_SAUDI_LIMIT || 50));

const excludedImageTokens = [
  'default-destinations',
  'destinations-riyadh',
  'jeddah-cutout',
  'dammam-2',
  'hail-1',
  'deriyah-1',
  '3-section-cover',
  '7-about-saudi',
  '2-travel-guide',
  '4-getting-around',
  'menu-things-to-do',
  'type-about-saudi'
];

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

function stripHtml(value = '') {
  return cleanText(String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
}

function firstSentence(text = '') {
  const cleaned = cleanText(text);
  if (!cleaned) return '';
  const sentence = cleaned.split(/(?<=[.!؟])\s+/)[0] || cleaned;
  return sentence.length > 260 ? `${sentence.slice(0, 257)}...` : sentence;
}

function highResScene7(url = '') {
  const clean = cleanText(url);
  if (!clean) return '';
  if (!/scene7\.com\/is\/image\/scth/i.test(clean)) return clean;
  const base = clean.split('?')[0].replace(/:crop-[^?]+$/i, '');
  return `${base}?wid=1920&hei=1080&fit=constrain&fmt=webp`;
}

function slugTokens(url = '', title = '') {
  const slug = String(url).split('/').filter(Boolean).pop() || title;
  return String(`${slug} ${title}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !['event', 'events', 'saudi', 'calendar', 'season', 'arabia', '2026', '2027'].includes(token));
}

function extractMeta(html, name) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)`, 'i');
  return cleanText(html.match(pattern)?.[1] || '');
}

function extractScene7Images(html) {
  const decoded = String(html || '').replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&amp;/g, '&');
  return [...decoded.matchAll(/https?:\/\/scth\.scene7\.com\/is\/image\/scth\/[^"'<>\\\s]+/g)]
    .map((match) => highResScene7(match[0]))
    .filter((value, index, values) => value && values.indexOf(value) === index);
}

function chooseImage(images, event) {
  const tokens = slugTokens(event.source_url || event.evidence_url, event.title);
  const scored = images
    .map((url) => {
      const lower = url.toLowerCase();
      const excluded = excludedImageTokens.some((token) => lower.includes(token));
      const score = tokens.reduce((sum, token) => sum + (lower.includes(token) ? 2 : 0), excluded ? -5 : 0);
      return { url, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.url || '';
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

async function fetchVisitSaudiPage(url) {
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
  const title = cleanText(extractMeta(html, 'og:title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const metaDescription = cleanText(extractMeta(html, 'description') || extractMeta(html, 'og:description'));
  const bodyText = stripHtml(html);
  const images = extractScene7Images(html);
  return { title, metaDescription, bodyText, images };
}

function findCandidate(event, candidatesByEventId, candidatesByKey) {
  if (event.id && candidatesByEventId.has(event.id)) return candidatesByEventId.get(event.id);
  const key = `${cleanText(event.title).toLowerCase()}|${event.starts_at || ''}`;
  return candidatesByKey.get(key) || {};
}

function applyVisitSaudiDetails(event, candidate = {}, page = {}) {
  assignEventCategory(event);
  const categoryLabel = categoryLabels(event.category, event)?.ar;
  const windowText = durationText(candidate.starts_at ? candidate : event);
  const officialDescription = cleanText(candidate.summary || event.summary || page.metaDescription || firstSentence(page.bodyText));
  const sourceUrl = cleanText(event.source_url || event.evidence_url || candidate.source_url || candidate.evidence_url || '');
  const chosenImage = chooseImage(page.images || [], event);
  const imageUrl = highResScene7(candidate.image_url || event.image_url || chosenImage);
  if (imageUrl) {
    event.image_url = imageUrl;
    event.original_image_url = event.original_image_url || imageUrl;
    event.image_source_url = sourceUrl;
    event.image_discovered_at = generatedAt;
    event.image_discovery_method = candidate.image_url || event.image_url ? 'catalog-candidate' : 'meta';
    event.image_alt = event.image_alt || `${event.title} - Visit Saudi`;
  }

  event.description = officialDescription || event.description || '';
  event.rich_summary = officialDescription || event.rich_summary || '';
  if (officialDescription) event.summary = `${firstSentence(officialDescription)} المصدر الرسمي: Visit Saudi.`;
  event.highlights = compactItems([
    ...(Array.isArray(event.highlights) ? event.highlights : []),
    `الموعد الرسمي: ${windowText}`,
    `الموقع: ${cleanText(event.venue || candidate.venue || event.city || candidate.city)}`,
    `التصنيف: ${categoryLabel}`,
    imageUrl ? 'الصورة الرسمية محفوظة بجودة عالية من مصدر Visit Saudi.' : '',
    'مصدر البيانات: Visit Saudi'
  ], 8, 220);
  event.program_outline = {
    provider: 'Visit Saudi Calendar',
    source_method: page.title ? 'official-page-html' : 'approved-catalog-row',
    source_url: sourceUrl,
    collected_at: generatedAt,
    official_description: officialDescription,
    duration_text: windowText,
    registration_deadline: cleanText(event.registration_deadline || ''),
    goals: compactItems([
      'تقديم بطاقة حضور موثقة من Visit Saudi للفعاليات والمواسم الوطنية.',
      'توضيح الموعد والموقع والتصنيف قبل انتقال الزائر إلى الفعالية.',
      'رفع جودة صفحة الفعالية لمحركات البحث والذكاءات عبر وصف وصورة ومصدر رسمي.'
    ], 6, 240),
    features: compactItems([
      `الفعالية: ${cleanText(event.title)}`,
      `النافذة الزمنية: ${windowText}`,
      `المدينة أو النطاق: ${cleanText(event.city || candidate.city)}`,
      `الموقع: ${cleanText(event.venue || candidate.venue)}`,
      `التصنيف: ${categoryLabel}`,
      imageUrl ? `الصورة الرسمية: ${imageUrl}` : '',
      page.title ? `عنوان الصفحة الرسمية: ${page.title}` : ''
    ], 8, 260),
    requirements: compactItems([
      'راجع صفحة Visit Saudi الرسمية قبل الحضور لاحتمال تحديث ساعات التشغيل أو المواقع الفرعية.',
      'استخدم EventLive لمتابعة العد التنازلي وحالة الفعالية عند اقتراب الموعد.'
    ], 4, 240),
    faqs: Object.fromEntries(Object.entries({
      source_scope: 'Visit Saudi official event or calendar page',
      city: cleanText(event.city || candidate.city),
      venue: cleanText(event.venue || candidate.venue),
      category: categoryLabel,
      image_status: imageUrl ? 'official_or_catalog_scene7_image' : 'not_available_in_current_source',
      live_schedule_status: 'Event-level page only; no timed session agenda was published in the extracted source.'
    }).filter(([, value]) => value))
  };
  event.richness_score = Math.max(Number(event.richness_score || 0), imageUrl ? 10 : 8);
  event.updated_at = generatedAt;
  normalizeEventCategoryMetadata(event);
  return { imageUrl, sourceMethod: event.program_outline.source_method };
}

const catalog = readJson(catalogPath, { events: [] });
const candidates = readJson(candidatesPath, { candidates: [] }).candidates || [];
const events = Array.isArray(catalog.events) ? catalog.events : [];
const visitCandidates = candidates.filter((candidate) => candidate.source_label === 'Visit Saudi Calendar');
const candidatesByEventId = new Map(visitCandidates.map((candidate) => [candidate.matched_catalog_event_id, candidate]));
const candidatesByKey = new Map(visitCandidates.map((candidate) => [`${cleanText(candidate.title).toLowerCase()}|${candidate.starts_at || ''}`, candidate]));
const targets = events.filter((event) => event.source_label === 'Visit Saudi Calendar').slice(0, limit);

const enriched = [];
const failed = [];

for (const event of targets) {
  const candidate = findCandidate(event, candidatesByEventId, candidatesByKey);
  let page = {};
  try {
    if (event.source_url || candidate.source_url) {
      page = await fetchVisitSaudiPage(event.source_url || candidate.source_url);
    }
  } catch (error) {
    failed.push({ id: event.id, title: event.title, source_url: event.source_url, reason: String(error.message || error) });
  }
  const result = applyVisitSaudiDetails(event, candidate, page);
  enriched.push({
    id: event.id,
    title: event.title,
    source_method: result.sourceMethod,
    image_url: result.imageUrl || '',
    fetched: Boolean(page.title),
    features: event.program_outline.features.length
  });
}

catalog.generated_for = catalog.generated_for || 'EventLive Saudi events catalog';
catalog.notes = catalog.notes || 'Auto-published official and approved-source Saudi events.';
writeJson(catalogPath, catalog);

const report = {
  generated_at: generatedAt,
  catalog: path.relative(root, catalogPath),
  source: 'Visit Saudi Calendar',
  totals: {
    targets: targets.length,
    candidates: visitCandidates.length,
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
  '# Visit Saudi Calendar Enrichment Report',
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

console.log('# EventLive Visit Saudi Calendar Enrichment');
console.log(`- Targets: ${report.totals.targets}`);
console.log(`- Enriched: ${report.totals.enriched}`);
console.log(`- Fetched: ${report.totals.fetched}`);
console.log(`- Images: ${report.totals.images}`);
console.log(`- Fetch failures: ${report.totals.fetch_failures}`);
console.log(`- Report: ${path.relative(root, reportMdPath)}`);
