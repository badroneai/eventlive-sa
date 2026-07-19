import fs from 'node:fs';
import path from 'node:path';
import { selectBacklogTargets } from './backlog-target-utils.mjs';
import { highResImage, isStillImage, preferredEventImage } from './backlog-image-utils.mjs';
import { assignEventCategory, categoryLabels, normalizeEventCategoryMetadata } from './category-taxonomy.mjs';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const reportJsonPath = path.join(root, 'reports', 'official-event-backlog-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'official-event-backlog-enrichment-report.md');
const generatedAt = new Date().toISOString();
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_BACKLOG_TIMEOUT_MS || 12000));
const limit = Math.max(1, Number(process.env.EVENTLIVE_BACKLOG_LIMIT || 100));
const concurrency = Math.min(8, Math.max(1, Number(process.env.EVENTLIVE_BACKLOG_CONCURRENCY || 5)));
const refreshIntervalMs = Math.max(60_000, Number(process.env.EVENTLIVE_BACKLOG_REFRESH_MS || 7 * 24 * 60 * 60 * 1000));
const forceRefresh = process.env.EVENTLIVE_BACKLOG_FORCE === '1';
const sourceLabels = new Set(String(process.env.EVENTLIVE_BACKLOG_SOURCE_LABELS || '').split(',').map((value) => value.trim()).filter(Boolean));

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
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactItems(items, limitValue = 8, maxLength = 320) {
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
    .slice(0, limitValue);
}

function isNavigationNoise(value = '') {
  const text = cleanText(value);
  return /Shop Art Jameel|Explore Hayy Jameel|Venue Hire|Current Upcoming Past/i.test(text);
}

function extractMeta(html, name) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)`, 'i');
  return cleanText(String(html || '').match(pattern)?.[1] || '');
}

function imageCandidates(html = '') {
  const decoded = String(html || '').replace(/&amp;/g, '&');
  return [
    extractMeta(decoded, 'og:image'),
    extractMeta(decoded, 'twitter:image'),
    ...[...decoded.matchAll(/https?:\/\/[^"'<>\\\s]+\.(?:png|jpe?g|webp|avif)(?:\?[^"'<>\\\s]*)?/gi)].map((match) => match[0]),
    ...[...decoded.matchAll(/https?:\/\/[^"'<>\\\s]*scene7\.com\/is\/image\/[^"'<>\\\s]+/gi)].map((match) => match[0])
  ].filter(isStillImage);
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

function sourceUrl(event = {}) {
  return cleanText(event.source_url || event.evidence_url || event.ticket_url || event.registration_url || '');
}

function providerName(event = {}) {
  return cleanText(event.source_label || event.organizer || 'EventLive Source');
}

function eventMode(event = {}) {
  const category = `${event.category || ''} ${event.tags?.join?.(' ') || ''} ${event.title || ''}`.toLowerCase();
  if (/bootcamp|course|training|workshop|دورة|تدريب|معسكر|ورشة/i.test(category)) return 'برنامج تدريبي';
  if (/festival|season|fan zone|families|entertainment|موسم|ترفيه|عائلات/i.test(category)) return 'تجربة حضور';
  if (/forum|summit|conference|ملتقى|قمة|مؤتمر/i.test(category)) return 'ملتقى أو مؤتمر';
  if (/exhibition|expo|auction|معرض|مزاد/i.test(category)) return 'معرض أو فعالية قطاعية';
  return 'فعالية';
}

function attendanceGuidance(event = {}) {
  const mode = eventMode(event);
  if (mode === 'برنامج تدريبي') return 'تحقق من متطلبات التسجيل والحضور من صفحة المصدر قبل بدء البرنامج.';
  if (mode === 'تجربة حضور') return 'راجع ساعات التشغيل وسياسة الدخول من صفحة المصدر قبل التوجه للموقع.';
  if (mode === 'ملتقى أو مؤتمر') return 'راجع جدول الجلسات النهائي وتحديثات التسجيل من الجهة المنظمة قبل الحضور.';
  if (mode === 'معرض أو فعالية قطاعية') return 'راجع مواعيد الدخول والقاعة ورابط التسجيل من صفحة المصدر الرسمية.';
  return 'راجع صفحة المصدر الرسمية قبل الحضور لاحتمال تحديث الوقت أو الموقع.';
}

async function fetchPageMeta(url) {
  if (!/^https?:\/\//i.test(url)) return { ok: false, reason: 'missing-url' };
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'ar,en;q=0.8',
        'user-agent': 'Mozilla/5.0 (compatible; EventLiveBacklogEnricher/1.0; +https://eventme.live)'
      }
    });
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    const html = await response.text();
    const title = cleanText(extractMeta(html, 'og:title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
    const description = cleanText(extractMeta(html, 'og:description') || extractMeta(html, 'description'));
    const image = highResImage(imageCandidates(html).find(isStillImage) || '');
    return { ok: true, title, description, image };
  } catch (error) {
    return { ok: false, reason: error?.message || 'fetch-failed' };
  }
}

function applyBacklogOutline(event, page = {}) {
  assignEventCategory(event);
  const categoryLabel = categoryLabels(event.category, event)?.ar;
  const provider = providerName(event);
  const url = sourceUrl(event);
  const windowText = durationText(event);
  const officialDescription = cleanText(
    page.description ||
    event.rich_summary ||
    event.description ||
    event.summary ||
    `${event.title} فعالية منشورة من ${provider} ضمن كتالوج EventLive.`
  );
  const imageUrl = preferredEventImage(page.image, event.image_url || event.original_image_url || '');
  const method = page.source_method || (page.ok ? 'official-page-meta' : (url ? 'approved-source-row' : 'eventlive-internal-seed'));

  if (!event.description || isNavigationNoise(event.description)) event.description = officialDescription;
  if (!event.rich_summary || isNavigationNoise(event.rich_summary)) event.rich_summary = officialDescription;
  event.summary = event.summary || officialDescription;
  if (imageUrl && isStillImage(imageUrl)) {
    event.image_url = imageUrl;
    event.original_image_url = imageUrl;
    event.image_alt = event.image_alt || event.title;
    event.image_source_url = event.image_source_url || url;
    event.image_discovered_at = event.image_discovered_at || generatedAt;
    event.image_discovery_method = page.image ? 'meta' : (event.image_discovery_method || 'catalog-candidate');
  }
  event.highlights = compactItems([
    ...(Array.isArray(event.highlights) ? event.highlights : []),
    windowText ? `الموعد: ${windowText}` : '',
    event.city ? `المدينة: ${event.city}` : '',
    event.venue ? `الموقع: ${event.venue}` : '',
    categoryLabel ? `التصنيف: ${categoryLabel}` : '',
    provider ? `المصدر: ${provider}` : ''
  ], 8, 240);
  event.program_outline = {
    provider,
    source_method: method,
    source_url: url,
    collected_at: generatedAt,
    official_description: officialDescription,
    duration_text: windowText,
    registration_deadline: cleanText(event.registration_deadline || ''),
    goals: compactItems([
      `تقديم ${eventMode(event)} موثقة من مصدرها ضمن EventLive.`,
      'توضيح الموعد والمدينة والموقع قبل قرار الحضور.',
      'إثراء بطاقة الفعالية لتكون مفيدة للمستخدم والذكاءات ومحركات البحث.'
    ], 6, 260),
    features: compactItems([
      `الفعالية: ${event.title}`,
      windowText ? `النافذة الزمنية: ${windowText}` : '',
      event.city ? `المدينة: ${event.city}` : '',
      event.venue ? `الموقع: ${event.venue}` : '',
      categoryLabel ? `التصنيف: ${categoryLabel}` : '',
      event.organizer ? `المنظم: ${event.organizer}` : '',
      imageUrl ? 'تتوفر صورة غلاف للبطاقة.' : '',
      url ? `رابط المصدر: ${url}` : ''
    ], 8, 280),
    requirements: compactItems([
      attendanceGuidance(event),
      'استخدم EventLive لمتابعة العد التنازلي وحالة الفعالية عند اقتراب الموعد.'
    ], 4, 260),
    faqs: Object.fromEntries(Object.entries({
      source_scope: page.ok ? 'Official page metadata and approved catalog row' : 'Approved catalog row',
      provider,
      city: cleanText(event.city || ''),
      venue: cleanText(event.venue || ''),
      category: categoryLabel,
      live_schedule_status: Number(event.sessions_count || 0) > 0
        ? `${Number(event.sessions_count)} official timed sessions were extracted from the official source.`
        : 'Event-level source only; no timed session agenda was extracted.'
    }).filter(([, value]) => value))
  };
  event.live_schedule_ready = Boolean(event.live_schedule_ready && Number(event.sessions_count || 0) > 0);
  event.richness_score = Math.max(Number(event.richness_score || 0), imageUrl ? 8 : 6);
  event.updated_at = generatedAt;
  normalizeEventCategoryMetadata(event);
}

const catalog = readJson(catalogPath, { events: [] });
const events = Array.isArray(catalog.events) ? catalog.events : [];
const scopedEvents = sourceLabels.size ? events.filter((event) => sourceLabels.has(event.source_label)) : events;
const targets = forceRefresh
  ? scopedEvents.filter((event) => event.approval_status === 'published').slice(0, limit)
  : selectBacklogTargets(scopedEvents, {
    limit,
    refreshIntervalMs,
    nowMs: Date.parse(generatedAt)
  });

const enriched = [];
const failed = [];

for (let offset = 0; offset < targets.length; offset += concurrency) {
  const batch = targets.slice(offset, offset + concurrency);
  const results = await Promise.all(batch.map(async (event) => {
    const url = sourceUrl(event);
    const page = event.source_label === 'Ithra Events'
      ? {
        ok: true,
        description: event.rich_summary || event.description || event.summary,
        image: event.image_url || '',
        source_method: 'official-public-algolia-index'
      }
      : await fetchPageMeta(url);
    applyBacklogOutline(event, page);
    return {
      row: {
        id: event.id,
        title: event.title,
        source_label: event.source_label,
        source_method: event.program_outline.source_method,
        source_url: url,
        fetched: Boolean(page.ok),
        image: Boolean(event.image_url),
        fetch_reason: page.ok ? '' : page.reason
      },
      failure: !page.ok && url
        ? { id: event.id, title: event.title, source_url: url, reason: page.reason }
        : null
    };
  }));
  for (const result of results) {
    enriched.push(result.row);
    if (result.failure) failed.push(result.failure);
  }
}

writeJson(catalogPath, catalog);

const report = {
  generated_at: generatedAt,
  totals: {
    targets: targets.length,
    enriched: enriched.length,
    fetched: enriched.filter((row) => row.fetched).length,
    images: enriched.filter((row) => row.image).length,
    fetch_failures: failed.length
  },
  enriched,
  failed
};
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# EventLive Official Event Backlog Enrichment',
  `- Generated at: ${generatedAt}`,
  `- Targets: ${report.totals.targets}`,
  `- Enriched: ${report.totals.enriched}`,
  `- Fetched: ${report.totals.fetched}`,
  `- Images: ${report.totals.images}`,
  `- Fetch failures: ${report.totals.fetch_failures}`,
  '',
  '| Source | Event | Method | Image | Fetch |',
  '|---|---|---:|---:|---:|',
  ...enriched.map((row) => `| ${row.source_label || ''} | ${row.title} | ${row.source_method} | ${row.image ? 'yes' : 'no'} | ${row.fetched ? 'yes' : row.fetch_reason || 'no'} |`)
].join('\n') + '\n', 'utf8');

console.log('# EventLive Official Event Backlog Enrichment');
console.log(`- Targets: ${report.totals.targets}`);
console.log(`- Enriched: ${report.totals.enriched}`);
console.log(`- Fetched: ${report.totals.fetched}`);
console.log(`- Images: ${report.totals.images}`);
console.log(`- Fetch failures: ${report.totals.fetch_failures}`);
console.log(`- Report: ${path.relative(root, reportMdPath)}`);
