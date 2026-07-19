import fs from 'node:fs';
import path from 'node:path';
import { assignEventCategory, categoryLabels, normalizeEventCategoryMetadata } from './category-taxonomy.mjs';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const reportJsonPath = path.join(root, 'reports', 'dhahran-expo-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'dhahran-expo-enrichment-report.md');
const generatedAt = new Date().toISOString();

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
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function compactItems(items, limit = 8, maxLength = 260) {
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

function findCandidate(event, candidatesByEventId, candidatesByKey) {
  if (event.id && candidatesByEventId.has(event.id)) return candidatesByEventId.get(event.id);
  const key = `${cleanText(event.title).toLowerCase()}|${event.starts_at || ''}`;
  return candidatesByKey.get(key) || {};
}

function officialDescription(event, candidate, categoryLabel) {
  const title = cleanText(candidate.title || event.title);
  const organizer = cleanText(candidate.organizer || event.organizer || 'Dhahran Expo');
  const city = cleanText(candidate.city || event.city || 'Dhahran');
  const venue = cleanText(candidate.venue || event.venue || 'Dhahran Expo');
  const windowText = durationText(candidate.starts_at ? candidate : event);
  return compactItems([
    `${title} مدرجة في التقويم الرسمي لـ Dhahran Expo لعام 2026.`,
    windowText ? `النافذة الزمنية المعلنة: ${windowText}.` : '',
    `الموقع: ${venue}، ${city}.`,
    `الجهة المنظمة: ${organizer}.`,
    `تصنيف الفعالية في EventLive: ${categoryLabel}.`
  ], 5, 420).join(' ');
}

function applyDhahranCalendarDetails(event, candidate = {}) {
  const organizer = cleanText(candidate.organizer || event.organizer || 'Dhahran Expo');
  const venue = cleanText(candidate.venue || event.venue || 'Dhahran Expo');
  const city = cleanText(candidate.city || event.city || 'Dhahran');
  const category = cleanText(event.raw_category || candidate.category || event.category || 'venue event');
  const windowText = durationText(candidate.starts_at ? candidate : event);
  const sourceUrl = cleanText(event.source_url || event.evidence_url || candidate.source_url || candidate.evidence_url || 'https://dhahranexpo.com.sa');

  event.organizer = organizer;
  event.venue = venue;
  event.city = city;
  assignEventCategory(event, category);
  const categoryLabel = categoryLabels(event.category, event)?.ar;
  const description = officialDescription(event, candidate, categoryLabel);
  event.description = description;
  event.rich_summary = description;
  event.summary = `فعالية مدرجة في التقويم الرسمي لـ Dhahran Expo. ${windowText ? `الموعد: ${windowText}. ` : ''}المنظم: ${organizer}.`;
  event.highlights = compactItems([
    ...(Array.isArray(event.highlights) ? event.highlights : []),
    `الموعد الرسمي: ${windowText}`,
    `الموقع: ${venue}، ${city}`,
    `المنظم: ${organizer}`,
    `مصدر البيانات: التقويم الرسمي لـ Dhahran Expo`
  ], 8, 220);
  event.tags = compactItems([
    ...(Array.isArray(event.tags) ? event.tags : []),
    'dhahran-expo',
    category
  ], 10, 80);
  event.program_outline = {
    provider: 'Dhahran Expo Calendar',
    source_method: 'official-calendar-html',
    source_url: sourceUrl,
    collected_at: generatedAt,
    official_description: description,
    duration_text: windowText,
    registration_deadline: cleanText(event.registration_deadline || ''),
    goals: compactItems([
      'تقديم بطاقة حضور موثقة اعتمادا على التقويم الرسمي للفعالية.',
      'إبراز الموعد والمكان والجهة المنظمة قبل زيارة Dhahran Expo.',
      'تمييز فعاليات المعارض والمؤتمرات في المنطقة الشرقية ضمن كتالوج EventLive.'
    ], 6, 220),
    features: compactItems([
      `الفعالية: ${cleanText(candidate.title || event.title)}`,
      `النافذة الزمنية: ${windowText}`,
      `الموقع: ${venue}، ${city}`,
      `المنظم: ${organizer}`,
      `التصنيف: ${categoryLabel}`,
      'المصدر: تقويم Dhahran Expo الرسمي'
    ], 8, 220),
    requirements: compactItems([
      'راجع رابط المصدر الرسمي قبل الحضور لاحتمال تحديث القاعات أو ساعات الدخول.',
      'استخدم صفحة الفعالية في EventLive لمتابعة العد التنازلي وحالة الموعد.'
    ], 4, 220),
    faqs: Object.fromEntries(Object.entries({
      source_scope: 'Official Dhahran Expo yearly calendar row',
      organizer,
      venue,
      city,
      category: categoryLabel,
      live_schedule_status: 'Calendar-level listing only; no timed sessions were published in the source row.'
    }).filter(([, value]) => value))
  };
  event.richness_score = Math.max(Number(event.richness_score || 0), 8);
  event.updated_at = generatedAt;
  normalizeEventCategoryMetadata(event);
  return event;
}

const catalog = readJson(catalogPath, { events: [] });
const candidates = readJson(candidatesPath, { candidates: [] }).candidates || [];
const events = Array.isArray(catalog.events) ? catalog.events : [];
const dhahranCandidates = candidates.filter((candidate) => /Dhahran Expo Calendar/i.test(`${candidate.source_label || ''} ${candidate.source_url || ''}`));
const candidatesByEventId = new Map(dhahranCandidates.map((candidate) => [candidate.matched_catalog_event_id, candidate]));
const candidatesByKey = new Map(dhahranCandidates.map((candidate) => [`${cleanText(candidate.title).toLowerCase()}|${candidate.starts_at || ''}`, candidate]));
const targets = events.filter((event) => /Dhahran Expo Calendar/i.test(`${event.source_label || ''} ${event.source_url || ''}`));

const enriched = [];
const skipped = [];

for (const event of targets) {
  const candidate = findCandidate(event, candidatesByEventId, candidatesByKey);
  if (!candidate?.title && !event.title) {
    skipped.push({ id: event.id, reason: 'missing title' });
    continue;
  }
  applyDhahranCalendarDetails(event, candidate);
  enriched.push({
    id: event.id,
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    organizer: event.organizer,
    category: event.category,
    features: event.program_outline.features.length
  });
}

catalog.generated_for = catalog.generated_for || 'EventLive Saudi events catalog';
catalog.notes = catalog.notes || 'Auto-published official and approved-source Saudi events.';
writeJson(catalogPath, catalog);

const report = {
  generated_at: generatedAt,
  catalog: path.relative(root, catalogPath),
  source: 'Dhahran Expo Calendar',
  totals: {
    targets: targets.length,
    candidates: dhahranCandidates.length,
    enriched: enriched.length,
    skipped: skipped.length
  },
  enriched,
  skipped
};
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# Dhahran Expo Calendar Enrichment Report',
  '',
  `- generated_at: ${generatedAt}`,
  `- targets: ${report.totals.targets}`,
  `- candidates: ${report.totals.candidates}`,
  `- enriched: ${report.totals.enriched}`,
  `- skipped: ${report.totals.skipped}`,
  '',
  '## Enriched',
  '',
  ...(enriched.length
    ? enriched.map((item) => `- ${item.title} - ${item.starts_at} to ${item.ends_at} - ${item.organizer} - features=${item.features}`)
    : ['- none']),
  '',
  '## Skipped',
  '',
  ...(skipped.length ? skipped.map((item) => `- ${item.id} - ${item.reason}`) : ['- none'])
].join('\n') + '\n', 'utf8');

console.log('# EventLive Dhahran Expo Calendar Enrichment');
console.log(`- Targets: ${report.totals.targets}`);
console.log(`- Candidates: ${report.totals.candidates}`);
console.log(`- Enriched: ${report.totals.enriched}`);
console.log(`- Skipped: ${report.totals.skipped}`);
console.log(`- Report: ${path.relative(root, reportMdPath)}`);
