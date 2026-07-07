import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const reportJsonPath = path.join(root, 'reports', 'sfda-workshop-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'sfda-workshop-enrichment-report.md');
const generatedAt = new Date().toISOString();
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_SFDA_TIMEOUT_MS || 15000));
const limit = Math.max(1, Number(process.env.EVENTLIVE_SFDA_LIMIT || 100));

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

function decodeHtml(value = '') {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function cleanText(value = '') {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sfdaId(event = {}) {
  const value = String(event.source_url || event.registration_url || event.evidence_url || '');
  const match = value.match(/\/workshop\/(\d+)/i);
  return match?.[1] || '';
}

function metaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>`, 'i');
  return decodeHtml(html.match(pattern)?.[1] || '').trim();
}

function parseSfdaDate(dateText, timeText, marker) {
  const [, day, month, year] = String(dateText || '').match(/^(\d{2})-(\d{2})-(\d{4})$/) || [];
  const [, rawHour, minute, second] = String(timeText || '').match(/^(\d{1,2}):(\d{2}):(\d{2})$/) || [];
  if (!day || !rawHour) return '';
  let hour = Number(rawHour);
  if (marker === 'م' && hour < 12) hour += 12;
  if (marker === 'ص' && hour === 12) hour = 0;
  return `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${minute}:${second}+03:00`;
}

function extractWorkshopDetails(html) {
  const text = cleanText(html);
  const dateMatch = text.match(/من\s+(\d{2}-\d{2}-\d{4})\s+(\d{1,2}:\d{2}:\d{2})\s+([صم])\s+حتى\s+(\d{2}-\d{2}-\d{4})\s+(\d{1,2}:\d{2}:\d{2})\s+([صم])\s+نوع الورشة\s+(.+?)\s+لغة العرض\s+(.+?)(?:\s+ورش عمل أخرى|\s+×|\s+خريطة الموقع|$)/);
  const delivery = text.match(/(?:ورش العمل\s+)?[^ ]+\s+(عن بعد|حضوري|افتراضي)\s+رابط الدخول لورشة العمل/)?.[1] || (text.includes('عن بعد') ? 'عن بعد' : '');
  return {
    title: metaContent(html, 'og:title') || cleanText(html.match(/<h1\b[\s\S]*?<\/h1>/i)?.[0] || ''),
    description: metaContent(html, 'description') || metaContent(html, 'og:description'),
    delivery,
    starts_at: dateMatch ? parseSfdaDate(dateMatch[1], dateMatch[2], dateMatch[3]) : '',
    ends_at: dateMatch ? parseSfdaDate(dateMatch[4], dateMatch[5], dateMatch[6]) : '',
    workshop_type: dateMatch ? dateMatch[7].trim() : '',
    language: dateMatch ? dateMatch[8].trim() : ''
  };
}

async function fetchSfdaWorkshop(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ar,en;q=0.8',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) EventLive/1.0 source enrichment'
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function applyWorkshop(event, details) {
  if (details.title) event.title = details.title;
  if (details.starts_at) event.starts_at = details.starts_at;
  if (details.ends_at) event.ends_at = details.ends_at;
  if (details.delivery) {
    event.venue = details.delivery;
    event.venue_address = details.delivery;
    event.attendance_mode = details.delivery === 'عن بعد' ? 'online' : event.attendance_mode;
  }
  const officialDescription = [
    details.title,
    details.delivery ? `طريقة الحضور: ${details.delivery}` : '',
    details.workshop_type ? `نوع الورشة: ${details.workshop_type}` : '',
    details.language ? `لغة العرض: ${details.language}` : ''
  ].filter(Boolean).join('. ');
  if (officialDescription) {
    event.description = officialDescription;
    event.rich_summary = officialDescription;
    event.summary = `${officialDescription}. المصدر الرسمي: الهيئة العامة للغذاء والدواء.`;
  }
  event.program_outline = {
    provider: 'Saudi Food and Drug Authority',
    source_method: 'official-html',
    source_url: event.source_url || event.evidence_url || '',
    collected_at: generatedAt,
    official_description: officialDescription || details.description || '',
    duration_text: details.starts_at && details.ends_at ? `${details.starts_at} إلى ${details.ends_at}` : '',
    registration_deadline: event.registration_deadline || '',
    goals: details.title ? [details.title] : [],
    features: [
      details.delivery ? `طريقة الحضور: ${details.delivery}` : '',
      details.workshop_type ? `نوع الورشة: ${details.workshop_type}` : '',
      details.language ? `لغة العرض: ${details.language}` : ''
    ].filter(Boolean),
    requirements: [],
    faqs: Object.fromEntries(Object.entries({
      delivery_method: details.delivery,
      workshop_type: details.workshop_type,
      presentation_language: details.language
    }).filter(([, value]) => value))
  };
  event.richness_score = Math.max(Number(event.richness_score || 0), 9);
  event.updated_at = generatedAt;
  return event;
}

const catalog = readJson(catalogPath, { events: [] });
const events = Array.isArray(catalog.events) ? catalog.events : [];
const targets = events
  .filter((event) => /saudi food and drug authority|sfda/i.test(`${event.source_label || ''} ${event.source_url || ''}`))
  .filter((event) => sfdaId(event))
  .slice(0, limit);

const enriched = [];
const failed = [];

for (const event of targets) {
  try {
    const html = await fetchSfdaWorkshop(event.source_url || event.evidence_url);
    const details = extractWorkshopDetails(html);
    applyWorkshop(event, details);
    enriched.push({
      id: event.id,
      title: event.title,
      workshop_id: sfdaId(event),
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      features: event.program_outline.features.length
    });
  } catch (error) {
    failed.push({ id: event.id, title: event.title, workshop_id: sfdaId(event), reason: String(error.message || error) });
  }
}

catalog.generated_for = catalog.generated_for || 'EventLive Saudi events catalog';
catalog.notes = catalog.notes || 'Auto-published official and approved-source Saudi events.';
writeJson(catalogPath, catalog);

const report = {
  generated_at: generatedAt,
  catalog: path.relative(root, catalogPath),
  totals: {
    targets: targets.length,
    enriched: enriched.length,
    failed: failed.length
  },
  enriched,
  failed
};
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# SFDA Workshop Enrichment Report',
  '',
  `- generated_at: ${generatedAt}`,
  `- targets: ${report.totals.targets}`,
  `- enriched: ${report.totals.enriched}`,
  `- failed: ${report.totals.failed}`,
  '',
  '## Enriched',
  '',
  ...(enriched.length ? enriched.map((item) => `- ${item.title} (${item.workshop_id}) - ${item.starts_at} to ${item.ends_at}, features=${item.features}`) : ['- none']),
  '',
  '## Failed',
  '',
  ...(failed.length ? failed.map((item) => `- ${item.title} (${item.workshop_id}) - ${item.reason}`) : ['- none'])
].join('\n') + '\n', 'utf8');

console.log('# EventLive SFDA Workshop Enrichment');
console.log(`- Targets: ${report.totals.targets}`);
console.log(`- Enriched: ${report.totals.enriched}`);
console.log(`- Failed: ${report.totals.failed}`);
console.log(`- Report: ${path.relative(root, reportMdPath)}`);
