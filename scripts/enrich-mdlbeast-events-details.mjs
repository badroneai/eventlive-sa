import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const reportJsonPath = path.join(root, 'reports', 'mdlbeast-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'mdlbeast-enrichment-report.md');
const generatedAt = new Date().toISOString();
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_MDLBEAST_TIMEOUT_MS || 20000));
const limit = Math.max(1, Number(process.env.EVENTLIVE_MDLBEAST_LIMIT || 50));

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
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactItems(items, limit = 8, maxLength = 360) {
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

function extractMeta(html, name) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)`, 'i');
  return cleanText(html.match(pattern)?.[1] || '');
}

function richTextToText(value) {
  const chunks = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (typeof node.value === 'string') chunks.push(node.value);
    if (Array.isArray(node.children)) node.children.forEach(walk);
  }
  walk(value?.value?.document || value?.document || value);
  return cleanText(chunks.join(' '));
}

function highResDato(url = '') {
  const clean = cleanText(url).replace(/&amp;/g, '&');
  if (!clean) return '';
  if (!/datocms-assets\.com/i.test(clean)) return clean;
  const base = clean.split('?')[0];
  return `${base}?auto=format&fit=max&w=2048&q=90`;
}

function isStillImage(url = '') {
  return /\.(jpe?g|png|webp|avif)(\?|$)/i.test(cleanText(url));
}

function datoStillImages(html = '') {
  const decoded = String(html || '').replace(/&amp;/g, '&');
  return [...decoded.matchAll(/https?:\/\/www\.datocms-assets\.com\/[^"'<>\\\s]+/gi)]
    .map((match) => match[0])
    .filter(isStillImage)
    .filter((url, index, urls) => urls.indexOf(url) === index);
}

function bestImage(event = {}, fallbackImage = '', htmlImages = []) {
  const candidates = [
    event.header?.[0]?.background?.url,
    event.header?.background?.url,
    event.config?.cover?.url,
    ...htmlImages,
    fallbackImage,
    event.config?.logo?.url
  ].filter(Boolean);
  const nonGeneric = candidates.find((url) => isStillImage(url) && !/1751801189-mdlbeast\.png|logo|navigation-icon/i.test(url));
  const anyStill = candidates.find(isStillImage);
  return highResDato(nonGeneric || anyStill || '');
}

function toRiyadhIso(value = '') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+03:00`;
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

function seoDescription(event = {}) {
  const tags = Array.isArray(event.seoTags) ? event.seoTags : [];
  const desc = tags.find((tag) => tag?.attributes?.name === 'description')?.attributes?.content ||
    tags.find((tag) => tag?.attributes?.property === 'og:description')?.attributes?.content;
  return cleanText(desc || '');
}

function sectionDescriptions(event = {}) {
  const sections = Array.isArray(event.sections) ? event.sections : [];
  return compactItems(sections.map((section) => richTextToText(section.contentDescription || section.countdownDescription || section.contentTitle)), 8, 520);
}

async function fetchMdlbeastPage(url) {
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
  const nextData = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  let event = {};
  if (nextData) {
    const parsed = JSON.parse(nextData);
    event = parsed?.props?.pageProps?.event || parsed?.props?.pageProps || {};
  }
  const htmlImages = datoStillImages(html);
  const descriptions = sectionDescriptions(event);
  const officialDescription = cleanText(
    richTextToText(event.config?.eventConfigDescription) ||
    descriptions.find((item) => item.length > 60) ||
    seoDescription(event) ||
    extractMeta(html, 'og:description')
  );
  return {
    title: cleanText(event.title || event.header?.[0]?.title || event.header?.title || extractMeta(html, 'og:title')).replace(/\s+\|\s+MDLBEAST.*$/i, ''),
    description: officialDescription,
    seo_description: seoDescription(event) || extractMeta(html, 'og:description'),
    sections: descriptions,
    image: bestImage(event, extractMeta(html, 'og:image'), htmlImages),
    city: cleanText(event.config?.city || ''),
    timezone: cleanText(event.config?.timezone || 'Asia/Riyadh'),
    starts_at: toRiyadhIso(event.config?.startDatetime),
    ends_at: toRiyadhIso(event.config?.endDatetime),
    ticket_url: cleanText(event.config?.navigationCta?.url || ''),
    ticket_label: cleanText(event.config?.navigationCta?.title || ''),
    slug: cleanText(event.slug || ''),
    fetched: Boolean(event.title || nextData)
  };
}

function findCandidate(event, candidatesByEventId, candidatesByKey) {
  if (event.id && candidatesByEventId.has(event.id)) return candidatesByEventId.get(event.id);
  const key = `${cleanText(event.title).toLowerCase()}|${event.starts_at || ''}`;
  return candidatesByKey.get(key) || {};
}

function applyMdlbeastDetails(event, candidate = {}, page = {}) {
  const sourceUrl = cleanText(event.source_url || event.evidence_url || candidate.source_url || candidate.evidence_url || '');
  const title = cleanText(page.title || candidate.title || event.title);
  const officialDescription = cleanText(page.description || page.seo_description || candidate.summary || event.summary);
  const imageUrl = cleanText(page.image || event.image_url || candidate.image_url || '');
  const startsAt = page.starts_at || event.starts_at || candidate.starts_at;
  const endsAt = page.ends_at || event.ends_at || candidate.ends_at;
  if (title) event.title = title;
  if (startsAt && endsAt) {
    event.starts_at = startsAt;
    event.ends_at = endsAt;
  }
  event.city = cleanText(page.city || event.city || candidate.city || 'Riyadh');
  event.venue = cleanText(event.venue || candidate.venue || page.city || 'Riyadh');
  event.organizer = 'MDLBEAST';
  event.category = 'music';
  event.description = officialDescription;
  event.rich_summary = officialDescription;
  event.summary = `${firstSentence(officialDescription)} المصدر الرسمي: MDLBEAST.`;
  if (page.ticket_url) {
    event.ticket_url = page.ticket_url;
    event.registration_url = page.ticket_url;
  }
  if (imageUrl) {
    event.image_url = imageUrl;
    event.original_image_url = event.original_image_url || imageUrl;
    event.image_alt = event.image_alt || `${event.title} - MDLBEAST`;
    event.image_source_url = sourceUrl;
    event.image_discovered_at = generatedAt;
    event.image_discovery_method = page.image ? 'json-ld' : 'catalog-candidate';
  }
  const windowText = durationText(event);
  event.highlights = compactItems([
    ...(Array.isArray(event.highlights) ? event.highlights : []),
    `الموعد الرسمي: ${windowText}`,
    `المدينة: ${event.city}`,
    page.ticket_label ? `إجراء الحجز: ${page.ticket_label}` : '',
    imageUrl ? 'الصورة الرسمية محفوظة من DatoCMS الخاص بـ MDLBEAST.' : ''
  ], 8, 240);
  event.program_outline = {
    provider: 'MDLBEAST',
    source_method: page.fetched ? 'official-next-data' : 'approved-calendar-row',
    source_url: sourceUrl,
    collected_at: generatedAt,
    official_description: officialDescription,
    duration_text: windowText,
    registration_deadline: cleanText(event.registration_deadline || ''),
    goals: compactItems([
      'تقديم بطاقة حضور موثقة من صفحة MDLBEAST الرسمية.',
      'إبراز تجربة الموسيقى والترفيه في الرياض ضمن تقويم EventLive الحي.',
      'توضيح رابط الحجز والصورة الرسمية والموعد للمستخدم قبل الذهاب.'
    ], 6, 260),
    features: compactItems([
      `الفعالية: ${event.title}`,
      `النافذة الزمنية: ${windowText}`,
      `المدينة: ${event.city}`,
      `المنظم: MDLBEAST`,
      page.ticket_url ? `رابط الحجز: ${page.ticket_url}` : '',
      imageUrl ? `الصورة الرسمية: ${imageUrl}` : '',
      ...page.sections
    ], 8, 320),
    requirements: compactItems([
      'راجع صفحة MDLBEAST الرسمية قبل الحضور لاحتمال تحديث التذاكر أو ساعات التشغيل.',
      'استخدم EventLive لمتابعة العد التنازلي وحالة الفعالية عند اقتراب الموعد.'
    ], 4, 260),
    faqs: Object.fromEntries(Object.entries({
      source_scope: 'MDLBEAST official event page from Next.js data',
      organizer: 'MDLBEAST',
      city: event.city,
      category: 'music',
      ticket_url: page.ticket_url || '',
      timezone: page.timezone || 'Asia/Riyadh',
      live_schedule_status: 'Event-level official page only; no timed session agenda was published in the extracted page.'
    }).filter(([, value]) => value))
  };
  event.richness_score = Math.max(Number(event.richness_score || 0), imageUrl ? 10 : 8);
  event.updated_at = generatedAt;
  return { imageUrl, fetched: Boolean(page.fetched), sourceMethod: event.program_outline.source_method };
}

const catalog = readJson(catalogPath, { events: [] });
const candidates = readJson(candidatesPath, { candidates: [] }).candidates || [];
const events = Array.isArray(catalog.events) ? catalog.events : [];
const mdlbeastCandidates = candidates.filter((candidate) => candidate.source_label === 'MDLBEAST Events');
const candidatesByEventId = new Map(mdlbeastCandidates.map((candidate) => [candidate.matched_catalog_event_id, candidate]));
const candidatesByKey = new Map(mdlbeastCandidates.map((candidate) => [`${cleanText(candidate.title).toLowerCase()}|${candidate.starts_at || ''}`, candidate]));
const targets = events.filter((event) => event.source_label === 'MDLBEAST Events').slice(0, limit);

const enriched = [];
const failed = [];

for (const event of targets) {
  const candidate = findCandidate(event, candidatesByEventId, candidatesByKey);
  let page = {};
  try {
    if (event.source_url || candidate.source_url) page = await fetchMdlbeastPage(event.source_url || candidate.source_url);
  } catch (error) {
    failed.push({ id: event.id, title: event.title, source_url: event.source_url, reason: String(error.message || error) });
  }
  const result = applyMdlbeastDetails(event, candidate, page);
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
  source: 'MDLBEAST Events',
  totals: {
    targets: targets.length,
    candidates: mdlbeastCandidates.length,
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
  '# MDLBEAST Enrichment Report',
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

console.log('# EventLive MDLBEAST Enrichment');
console.log(`- Targets: ${report.totals.targets}`);
console.log(`- Enriched: ${report.totals.enriched}`);
console.log(`- Fetched: ${report.totals.fetched}`);
console.log(`- Images: ${report.totals.images}`);
console.log(`- Fetch failures: ${report.totals.fetch_failures}`);
console.log(`- Report: ${path.relative(root, reportMdPath)}`);
