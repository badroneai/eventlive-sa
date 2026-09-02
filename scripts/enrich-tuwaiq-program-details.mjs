import fs from 'node:fs';
import path from 'node:path';
import { stripSourceAttribution, withSourceAttribution } from './source-attribution-utils.mjs';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const reportJsonPath = path.join(root, 'reports', 'tuwaiq-program-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'tuwaiq-program-enrichment-report.md');
const generatedAt = new Date().toISOString();
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_TUWAIQ_TIMEOUT_MS || 15000));
const limit = Math.max(1, Number(process.env.EVENTLIVE_TUWAIQ_LIMIT || 200));

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

function tuwaiqSlug(event = {}) {
  const value = String(event.source_url || event.registration_url || event.evidence_url || '');
  const match = value.match(/\/bootcamp\/([^/]+)\/view/i);
  return match?.[1] || '';
}

function cleanList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function firstSentence(text = '') {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const sentence = cleaned.split(/(?<=[.!؟])\s+/)[0] || cleaned;
  return sentence.length > 240 ? `${sentence.slice(0, 237)}...` : sentence;
}

async function fetchTuwaiqCourse(slug) {
  const url = `https://tuwaiq.edu.sa/api/GetInitiativePublishBySlug/${encodeURIComponent(slug)}`;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: 'application/json',
      'accept-language': 'ar,en;q=0.8',
      referer: `https://tuwaiq.edu.sa/bootcamp/${slug}/view`,
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function applyCourse(event, course, slug) {
  const goals = cleanList(course.goals);
  const features = cleanList(course.features);
  const requirements = cleanList(course.requirements);
  const officialDescription = String(course.description || '').trim();
  const outline = {
    provider: 'Tuwaiq Academy',
    source_method: 'official-api',
    source_url: `https://tuwaiq.edu.sa/api/GetInitiativePublishBySlug/${slug}`,
    collected_at: generatedAt,
    official_description: officialDescription,
    duration_text: String(course.durationText || '').trim(),
    registration_deadline: course.registrationEndDate || event.registration_deadline || '',
    goals,
    features,
    requirements,
    faqs: course.faqs && typeof course.faqs === 'object' && !Array.isArray(course.faqs) ? course.faqs : {}
  };

  event.description = officialDescription || event.description || '';
  event.rich_summary = officialDescription || event.rich_summary || stripSourceAttribution(event.summary) || '';
  const concise = firstSentence(officialDescription);
  if (concise) event.summary = withSourceAttribution(concise, 'أكاديمية طويق');
  if (course.locationName) {
    event.venue = course.locationName;
    event.venue_address = course.locationName;
  }
  if (course.registrationEndDate) event.registration_deadline = course.registrationEndDate;
  if (course.startDate) event.starts_at = course.startDate;
  if (course.endDate) event.ends_at = course.endDate;
  if (course.innerImage && !event.image_url) {
    event.image_url = `https://cdn.tuwaiq.edu.sa/initiatives_admin/${course.innerImage}`;
    event.image_source_url = event.source_url || event.registration_url || '';
  }
  event.program_outline = outline;
  event.richness_score = Math.max(Number(event.richness_score || 0), 10);
  event.updated_at = generatedAt;
  return event;
}

const catalog = readJson(catalogPath, { events: [] });
const events = Array.isArray(catalog.events) ? catalog.events : [];
const targets = events
  .filter((event) => /tuwaiq/i.test(`${event.source_label || ''} ${event.source_url || ''}`))
  .filter((event) => tuwaiqSlug(event))
  .slice(0, limit);

const enriched = [];
const failed = [];

for (const event of targets) {
  const slug = tuwaiqSlug(event);
  try {
    const course = await fetchTuwaiqCourse(slug);
    applyCourse(event, course, slug);
    enriched.push({
      id: event.id,
      title: event.title,
      slug,
      goals: event.program_outline.goals.length,
      features: event.program_outline.features.length,
      requirements: event.program_outline.requirements.length
    });
  } catch (error) {
    failed.push({ id: event.id, title: event.title, slug, reason: String(error.message || error) });
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
  '# Tuwaiq Program Enrichment Report',
  '',
  `- generated_at: ${generatedAt}`,
  `- targets: ${report.totals.targets}`,
  `- enriched: ${report.totals.enriched}`,
  `- failed: ${report.totals.failed}`,
  '',
  '## Enriched',
  '',
  ...(enriched.length ? enriched.map((item) => `- ${item.title} (${item.slug}) - goals=${item.goals}, features=${item.features}, requirements=${item.requirements}`) : ['- none']),
  '',
  '## Failed',
  '',
  ...(failed.length ? failed.map((item) => `- ${item.title} (${item.slug}) - ${item.reason}`) : ['- none'])
].join('\n') + '\n', 'utf8');

console.log('# EventLive Tuwaiq Program Enrichment');
console.log(`- Targets: ${report.totals.targets}`);
console.log(`- Enriched: ${report.totals.enriched}`);
console.log(`- Failed: ${report.totals.failed}`);
console.log(`- Report: ${path.relative(root, reportMdPath)}`);
