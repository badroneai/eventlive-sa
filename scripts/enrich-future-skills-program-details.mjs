import fs from 'node:fs';
import path from 'node:path';
import { withSourceAttribution } from './source-attribution-utils.mjs';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const reportJsonPath = path.join(root, 'reports', 'future-skills-program-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'future-skills-program-enrichment-report.md');
const generatedAt = new Date().toISOString();
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_FUTURE_SKILLS_TIMEOUT_MS || 15000));
const limit = Math.max(1, Number(process.env.EVENTLIVE_FUTURE_SKILLS_LIMIT || 100));
const baseUrl = 'https://futureskills.mcit.gov.sa';

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
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(?:p|li|h[1-6]|div|tr|td|th)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u2060/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanListItem(value = '') {
  return cleanText(value)
    .replace(/^[.)\s]*\d+[.)\s]*/g, '')
    .replace(/^\.+\d+\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteSourceUrl(value = '') {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
}

function futureSkillsId(event = {}) {
  const value = String(event.source_url || event.registration_url || event.evidence_url || '');
  const match = value.match(/\/group\/(\d+)/i);
  return match?.[1] || '';
}

function extractTitle(html) {
  return cleanText(html.match(/<h1\b[\s\S]*?<\/h1>/i)?.[0] || '');
}

function extractImageUrl(html) {
  const imageTag = html.match(/<div class="field-learning-path-media-image">[\s\S]*?<img\b[^>]*>/i)?.[0] || '';
  const src = imageTag.match(/\bsrc=["']([^"']+)["']/i)?.[1] || '';
  return absoluteSourceUrl(src);
}

function extractGoal(html) {
  const basic = html.match(/<div class="course-basic-info">([\s\S]*?)<hr class="my-5 w-100">/i)?.[1] || '';
  const text = cleanText(basic);
  const marker = 'هدف التدريب';
  const index = text.indexOf(marker);
  return index >= 0 ? text.slice(index + marker.length).trim() : '';
}

function extractInfoLists(html) {
  const blocks = [...html.matchAll(/<div class="info-list mt-3">([\s\S]*?)<\/div>/gi)];
  const entries = {};
  for (const block of blocks) {
    const body = block[1] || '';
    const heading = cleanText(body.match(/<h5\b[\s\S]*?<\/h5>/i)?.[0] || '');
    if (!heading) continue;
    const listItems = [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((item) => cleanListItem(item[1]))
      .filter(Boolean);
    const fullText = cleanText(body.replace(/<h5\b[\s\S]*?<\/h5>/i, ''));
    entries[heading] = listItems.length ? listItems : (fullText ? [fullText] : []);
  }
  return entries;
}

function extractSidebar(html) {
  const entries = {};
  const items = [...html.matchAll(/<li class="course-detailes-li[^"]*">([\s\S]*?)(?=<li class="course-detailes-li|<\/ul><\/div><\/div>)/gi)];
  for (const item of items) {
    const body = item[1] || '';
    const label = cleanText(body.match(/<span class="d-block">([\s\S]*?)<\/span>/i)?.[1] || '');
    const value = cleanText(body.replace(/<span class="d-block">[\s\S]*?<\/span>/i, ''));
    if (label && value) entries[label] = value;
  }
  return entries;
}

function extractTable(html) {
  const entries = {};
  const rows = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];
  for (const row of rows) {
    const body = row[1] || '';
    const label = cleanText(body.match(/<th\b[\s\S]*?<\/th>/i)?.[0] || '');
    const value = cleanText(body.match(/<td\b[\s\S]*?<\/td>/i)?.[0] || '');
    if (label && value) entries[label] = value;
  }
  return entries;
}

function firstSentence(text = '') {
  const cleaned = cleanText(text);
  if (!cleaned) return '';
  const sentence = cleaned.split(/(?<=[.!؟])\s+/)[0] || cleaned;
  return sentence.length > 240 ? `${sentence.slice(0, 237)}...` : sentence;
}

async function fetchFutureSkillsPage(groupId) {
  const url = `${baseUrl}/ar/group/${encodeURIComponent(groupId)}`;
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

function applyPage(event, html, groupId) {
  const infoLists = extractInfoLists(html);
  const sidebar = extractSidebar(html);
  const table = extractTable(html);
  const title = extractTitle(html);
  const officialDescription = extractGoal(html);
  const topics = infoLists['فهرس موضوعات التدريب'] || [];
  const outcomes = infoLists['مخرجات التعلم'] || [];
  const requirements = infoLists['المتطلبات السابقة للتدريب'] || [];
  const durationText = sidebar['موعد البرنامج'] || '';
  const courseProvider = table['اسم مقدم الدورة'] || '';
  const imageUrl = extractImageUrl(html);

  if (title) event.title = title;
  if (officialDescription) {
    event.description = officialDescription;
    event.rich_summary = officialDescription;
    event.summary = withSourceAttribution(firstSentence(officialDescription), 'بوابة مهارات المستقبل');
  }
  if (durationText) event.highlights = [...new Set([...(event.highlights || []), durationText])];
  if (imageUrl && !/styles\/medium\/public\/2026-07/i.test(imageUrl)) {
    event.image_url = imageUrl;
    event.original_image_url = imageUrl;
    event.image_source_url = event.source_url || event.evidence_url || '';
    event.image_discovery_method = event.image_discovery_method || 'img';
    event.image_discovered_at = event.image_discovered_at || generatedAt;
  }

  event.program_outline = {
    provider: 'Future Skills MCIT',
    source_method: 'official-html',
    source_url: `${baseUrl}/ar/group/${groupId}`,
    collected_at: generatedAt,
    official_description: officialDescription,
    duration_text: durationText,
    registration_deadline: event.registration_deadline || '',
    goals: outcomes,
    features: topics,
    requirements,
    faqs: Object.fromEntries(Object.entries({
      training_field: sidebar['مجال التدريب'],
      career_track: sidebar['المسار الوظيفي'],
      course_type: sidebar['نوع الدورة'],
      course_level: sidebar['مستوى الدورة التدريبية'],
      delivery_method: sidebar['طريقة توصيل الدورة'],
      course_provider: courseProvider,
      professional_certificates: table['الشهادات الإحترافية المتعلقة'],
      trainer_experience: table['خبرات المدرب']
    }).filter(([, value]) => value))
  };
  event.richness_score = Math.max(Number(event.richness_score || 0), 10);
  event.updated_at = generatedAt;
  return event;
}

const catalog = readJson(catalogPath, { events: [] });
const events = Array.isArray(catalog.events) ? catalog.events : [];
const targets = events
  .filter((event) => /future skills/i.test(`${event.source_label || ''} ${event.source_url || ''}`))
  .filter((event) => futureSkillsId(event))
  .slice(0, limit);

const enriched = [];
const failed = [];

for (const event of targets) {
  const groupId = futureSkillsId(event);
  try {
    const html = await fetchFutureSkillsPage(groupId);
    applyPage(event, html, groupId);
    enriched.push({
      id: event.id,
      title: event.title,
      group_id: groupId,
      goals: event.program_outline.goals.length,
      features: event.program_outline.features.length,
      requirements: event.program_outline.requirements.length,
      metadata: Object.keys(event.program_outline.faqs).length
    });
  } catch (error) {
    failed.push({ id: event.id, title: event.title, group_id: groupId, reason: String(error.message || error) });
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
  '# Future Skills Program Enrichment Report',
  '',
  `- generated_at: ${generatedAt}`,
  `- targets: ${report.totals.targets}`,
  `- enriched: ${report.totals.enriched}`,
  `- failed: ${report.totals.failed}`,
  '',
  '## Enriched',
  '',
  ...(enriched.length ? enriched.map((item) => `- ${item.title} (${item.group_id}) - outcomes=${item.goals}, topics=${item.features}, requirements=${item.requirements}, metadata=${item.metadata}`) : ['- none']),
  '',
  '## Failed',
  '',
  ...(failed.length ? failed.map((item) => `- ${item.title} (${item.group_id}) - ${item.reason}`) : ['- none'])
].join('\n') + '\n', 'utf8');

console.log('# EventLive Future Skills Program Enrichment');
console.log(`- Targets: ${report.totals.targets}`);
console.log(`- Enriched: ${report.totals.enriched}`);
console.log(`- Failed: ${report.totals.failed}`);
console.log(`- Report: ${path.relative(root, reportMdPath)}`);
