import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const reportJsonPath = path.join(root, 'reports', 'misk-program-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'misk-program-enrichment-report.md');
const generatedAt = new Date().toISOString();
const timeoutMs = Math.max(3000, Number(process.env.EVENTLIVE_MISK_TIMEOUT_MS || 20000));
const limit = Math.max(1, Number(process.env.EVENTLIVE_MISK_LIMIT || 100));

const monthMap = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12'
};

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
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(?:p|li|h[1-6]|div|section|article)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function metaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>`, 'i');
  return decodeHtml(html.match(pattern)?.[1] || '').replace(/\s+/g, ' ').trim();
}

function textBetween(text, startMarker, endMarkers = []) {
  const start = text.toLowerCase().indexOf(startMarker.toLowerCase());
  if (start < 0) return '';
  const from = start + startMarker.length;
  let end = text.length;
  for (const marker of endMarkers) {
    const index = text.toLowerCase().indexOf(marker.toLowerCase(), from);
    if (index >= 0 && index < end) end = index;
  }
  return text.slice(from, end).replace(/\s+/g, ' ').trim();
}

function takeItems(block = '', markers = []) {
  if (!block) return [];
  const starts = [];
  for (const marker of markers) {
    const regex = new RegExp(`(?:^|\\\\s)(${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\\\s+`, 'gi');
    for (const match of block.matchAll(regex)) starts.push({ index: match.index + match[0].indexOf(match[1]), marker: match[1] });
  }
  starts.sort((a, b) => a.index - b.index);
  if (!starts.length) {
    return block
      .split(/\s+(?=(?:[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4}\s*:))/)
      .map((item) => item.trim())
      .filter((item) => item.length > 18)
      .slice(0, 10);
  }
  return starts.map((entry, index) => {
    const end = starts[index + 1]?.index ?? block.length;
    return block.slice(entry.index, end).trim();
  }).filter(Boolean);
}

function compactItems(items = [], maxItems = 8, maxLength = 420) {
  return [...new Set(items)]
    .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
    .filter((item) => item.length > 8)
    .map((item) => (item.length > maxLength ? `${item.slice(0, maxLength - 3)}...` : item))
    .slice(0, maxItems);
}

function parseMiskDate(value = '', endOfDay = false) {
  const match = String(value || '').match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!match) return '';
  const [, day, month, year] = match;
  const monthNumber = monthMap[month.toLowerCase()];
  if (!monthNumber) return '';
  return `${year}-${monthNumber}-${String(day).padStart(2, '0')}T${endOfDay ? '18:00:00' : '09:00:00'}+03:00`;
}

function parseDateRange(text) {
  const match = text.match(/Program Start\/End Date\s+(.+?)\s+-\s+(.+?)\s+Applications open/i);
  if (!match) return {};
  const startsAt = parseMiskDate(match[1]);
  const endsAt = parseMiskDate(match[2], true);
  if (!startsAt || !endsAt || new Date(endsAt) < new Date(startsAt)) return {};
  return {
    starts_at: startsAt,
    ends_at: endsAt
  };
}

function parseApplicationClose(text) {
  const match = text.match(/Application Close\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/i);
  return match ? parseMiskDate(match[1], true) : '';
}

function keepPlausibleRegistrationDeadline(deadline, startsAt) {
  if (!deadline || !startsAt) return '';
  const deadlineYear = Number(deadline.slice(0, 4));
  const startYear = Number(startsAt.slice(0, 4));
  return deadlineYear === startYear ? deadline : '';
}

function parseCandidateDeadline(candidate = {}) {
  const summary = String(candidate.summary || '');
  const startsAt = candidate.starts_at || '';
  const startYear = startsAt.slice(0, 4);
  if (!startYear) return '';
  const match = summary.match(/Applications closing on\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})/i);
  if (!match) return '';
  const month = monthMap[match[2].toLowerCase()];
  if (!month) return '';
  return `${startYear}-${month}-${String(match[1]).padStart(2, '0')}T18:00:00+03:00`;
}

// Misk program pages prepend tab labels, a metadata grid, and UI chrome
// ("Program Objectives Program Information ... Notify Me Loading...") to the
// page text. Any description that still carries that prefix is page chrome,
// not content — cut everything up to the last chrome token.
function stripMiskPageChrome(text = '') {
  let cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^[\s\S]*?Notify Me\s*Loading\.{0,3}\s*/i, '');
  cleaned = cleaned.replace(/^Program Details\s+/i, '');
  return cleaned.trim();
}

function firstSentence(text = '') {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const sentence = cleaned.split(/(?<=[.!؟])\s+/)[0] || cleaned;
  return sentence.length > 260 ? `${sentence.slice(0, 257)}...` : sentence;
}

function extractMiskDetails(html) {
  const text = cleanText(html);
  const title = metaContent(html, 'og:title') || cleanText(html.match(/<title\b[\s\S]*?<\/title>/i)?.[0] || '').replace(/\s*\|\s*Misk.*$/i, '');
  const description = metaContent(html, 'description') || metaContent(html, 'og:description');
  const dateRange = parseDateRange(text);
  const overview = textBetween(text, 'Program Overview', ['Who Should Apply?', 'Program Highlights', 'Program Outcomes', 'Application criteria', 'Application Process'])
    || textBetween(text, 'Program Details', ['Program Objectives', 'Meet the Expert', 'Program Achievements', 'Who Should Apply?', 'Program Highlights', 'Program Outcomes', 'Application criteria', 'Application Process', 'Frequently asked questions']);
  const whoShouldApply = textBetween(text, 'Who Should Apply?', ['Program Highlights', 'Startup Journey', 'Program Outcomes', 'Application criteria', 'Application Process']);
  const highlightsBlock = textBetween(text, 'Program Highlights', ['Startup Journey', 'Program Outcomes', 'Application criteria', 'Application Process']);
  const outcomesBlock = textBetween(text, 'Program Outcomes', ['Program Achievements', 'Testimonials', 'Application criteria', 'Application Process']);
  const criteriaBlock = textBetween(text, 'Application criteria', ['Application Process', 'Frequently asked questions', 'Can’t find what you need?']);
  const faqBlock = textBetween(text, 'Frequently asked questions', ['Can’t find what you need?', 'Contact Us', 'Apply Now']);
  const formatMatch = text.match(/Program Format\s+(.+?)\s+Program Type\s+(.+?)\s+Language\s+(.+?)\s+Page Sections/i)
    || text.match(/Program Format\s+(.+?)\s+Program Type\s+(.+?)\s+Language\s+(.+?)\s+[A-Z][A-Za-z0-9 ]+\s+\d/i);
  return {
    title,
    description,
    overview,
    starts_at: dateRange.starts_at,
    ends_at: dateRange.ends_at,
    registration_deadline: keepPlausibleRegistrationDeadline(parseApplicationClose(text), dateRange.starts_at),
    format: formatMatch?.[1]?.trim() || '',
    program_type: formatMatch?.[2]?.trim() || '',
    language: formatMatch?.[3]?.trim() || '',
    audiences: takeItems(whoShouldApply, ['Aspiring entrepreneurs', 'Startups', 'Founders', 'Professionals', 'Students', 'Youth', 'Leaders']),
    highlights: takeItems(highlightsBlock, ['10-Week Hybrid Experience', 'Zero Enrollment Cost', 'Extended Investment Readiness', 'Featured Tracks', 'Virtual sessions', 'Fully sponsored']),
    outcomes: takeItems(outcomesBlock, ['Participation', 'Guidance', 'Idea validation', 'Peer learning', '1:1 mentorship', 'Development', 'Lifetime access', 'Insights', 'Investment-related support']),
    requirements: takeItems(criteriaBlock, ['Startup Stage', 'Location Focus', 'Commitment', 'Language Proficiency', 'Team Structure', 'Age', 'Nationality', 'Experience']),
    faq_summary: faqBlock.slice(0, 800)
  };
}

async function fetchMiskProgram(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en,ar;q=0.8',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) EventLive/1.0 source enrichment'
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function validRange(startsAt, endsAt) {
  return Boolean(startsAt && endsAt && new Date(endsAt) >= new Date(startsAt));
}

function applyProgram(event, details, fallback = {}) {
  const previousOutline = event.program_outline && typeof event.program_outline === 'object'
    ? event.program_outline
    : {};
  if (details.title) event.title = details.title;
  if (validRange(details.starts_at, details.ends_at)) {
    event.starts_at = details.starts_at;
    event.ends_at = details.ends_at;
  } else if (validRange(fallback.starts_at, fallback.ends_at)) {
    event.starts_at = fallback.starts_at;
    event.ends_at = fallback.ends_at;
  }
  const fallbackDeadline = parseCandidateDeadline(fallback);
  const registrationDeadline = details.registration_deadline || fallbackDeadline;
  if (registrationDeadline) event.registration_deadline = registrationDeadline;
  const officialDescription = [details.overview, details.description, event.summary]
    .map((value) => stripMiskPageChrome(value))
    .find((value) => value && value.length > 40) || '';
  if (officialDescription) {
    event.description = officialDescription;
    event.rich_summary = officialDescription;
    event.summary = `${firstSentence(officialDescription)} المصدر الرسمي: Misk Hub.`;
  }
  const metadataFeatures = [
    details.format ? `Program format: ${details.format}` : '',
    details.program_type ? `Program type: ${details.program_type}` : '',
    details.language ? `Language: ${details.language}` : '',
    registrationDeadline ? `Application close: ${registrationDeadline}` : ''
  ].filter(Boolean);
  const goals = compactItems(details.outcomes.length ? details.outcomes : details.audiences, 8, 420);
  const freshFeatures = compactItems(details.highlights.length ? details.highlights : metadataFeatures, 8, 420);
  // Misk occasionally returns the program overview while omitting both the
  // highlights block and metadata grid. A partial refresh must not erase the
  // last verified feature set and turn a published row structurally invalid.
  const features = freshFeatures.length
    ? freshFeatures
    : compactItems(Array.isArray(previousOutline.features) ? previousOutline.features : [], 8, 420);
  const requirements = compactItems(details.requirements, 8, 420);
  event.program_outline = {
    provider: 'Misk Hub',
    source_method: 'official-html',
    source_url: event.source_url || event.evidence_url || '',
    collected_at: generatedAt,
    official_description: officialDescription,
    duration_text: details.starts_at && details.ends_at ? `${details.starts_at} إلى ${details.ends_at}` : '',
    registration_deadline: registrationDeadline || event.registration_deadline || '',
    goals: goals.length ? goals : compactItems([officialDescription], 1, 420),
    features,
    requirements,
    faqs: Object.fromEntries(Object.entries({
      program_format: details.format || event.venue_address || event.attendance_mode,
      program_type: details.program_type,
      language: details.language,
      who_should_apply: details.audiences.join(' | '),
      application_close: registrationDeadline || event.registration_deadline || '',
      faq_summary: details.faq_summary
    }).filter(([, value]) => value))
  };
  event.richness_score = Math.max(Number(event.richness_score || 0), 10);
  event.updated_at = generatedAt;
  return event;
}

const catalog = readJson(catalogPath, { events: [] });
const candidatesCatalog = readJson(candidatesPath, { candidates: [] });
const events = Array.isArray(catalog.events) ? catalog.events : [];
const candidates = Array.isArray(candidatesCatalog.candidates) ? candidatesCatalog.candidates : [];
const candidateByEventId = new Map(candidates
  .filter((candidate) => candidate.matched_catalog_event_id)
  .map((candidate) => [candidate.matched_catalog_event_id, candidate]));
const candidateBySourceUrl = new Map(candidates
  .filter((candidate) => candidate.source_url)
  .map((candidate) => [candidate.source_url, candidate]));
const targets = events
  .filter((event) => /misk hub/i.test(`${event.source_label || ''} ${event.source_url || ''}`))
  .filter((event) => /^https:\/\/hub\.misk\.org\.sa\/programs\//i.test(event.source_url || event.evidence_url || ''))
  .slice(0, limit);

const enriched = [];
const failed = [];

for (const event of targets) {
  try {
    const html = await fetchMiskProgram(event.source_url || event.evidence_url);
    const details = extractMiskDetails(html);
    const fallback = candidateByEventId.get(event.id) || candidateBySourceUrl.get(event.source_url) || {};
    applyProgram(event, details, fallback);
    enriched.push({
      id: event.id,
      title: event.title,
      goals: event.program_outline.goals.length,
      features: event.program_outline.features.length,
      requirements: event.program_outline.requirements.length,
      registration_deadline: event.registration_deadline || ''
    });
  } catch (error) {
    failed.push({ id: event.id, title: event.title, reason: String(error.message || error) });
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
  '# Misk Program Enrichment Report',
  '',
  `- generated_at: ${generatedAt}`,
  `- targets: ${report.totals.targets}`,
  `- enriched: ${report.totals.enriched}`,
  `- failed: ${report.totals.failed}`,
  '',
  '## Enriched',
  '',
  ...(enriched.length ? enriched.map((item) => `- ${item.title} - goals=${item.goals}, features=${item.features}, requirements=${item.requirements}, registration_deadline=${item.registration_deadline || 'n/a'}`) : ['- none']),
  '',
  '## Failed',
  '',
  ...(failed.length ? failed.map((item) => `- ${item.title} - ${item.reason}`) : ['- none'])
].join('\n') + '\n', 'utf8');

console.log('# EventLive Misk Program Enrichment');
console.log(`- Targets: ${report.totals.targets}`);
console.log(`- Enriched: ${report.totals.enriched}`);
console.log(`- Failed: ${report.totals.failed}`);
console.log(`- Report: ${path.relative(root, reportMdPath)}`);
