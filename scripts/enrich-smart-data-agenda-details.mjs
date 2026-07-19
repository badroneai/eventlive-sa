import fs from 'node:fs';
import path from 'node:path';
import { assignEventCategory, normalizeEventCategoryMetadata } from './category-taxonomy.mjs';
import { parseSmartDataAgendaHtml } from './smart-data-agenda-utils.mjs';

const root = process.cwd();
const eventUrl = 'https://saudi.smartdataseries.com/';
const agendaUrl = `${eventUrl}agenda`;
const generatedAt = new Date().toISOString();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const reportJsonPath = path.join(root, 'reports', 'smart-data-agenda-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'smart-data-agenda-enrichment-report.md');

function readJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function isTarget(row = {}) {
  return String(row.id || '') === 'event-smart-data-ai-summit'
    || (/Smart Data\s*&\s*AI Summit/i.test(String(row.title || '')) && String(row.starts_at || '').startsWith('2026-08-26'));
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 EventLive/1.0 (+https://eventme.live/)' },
    signal: AbortSignal.timeout(45_000),
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  const html = await response.text();
  const hasAgendaPayload = /id=["']tab_1["']/i.test(html) && /id=["']section_1_\d+["']/i.test(html);
  if (!hasAgendaPayload && /attention required|access denied|cloudflare/i.test(html.slice(0, 12000))) {
    throw new Error(`${url} returned a protection page`);
  }
  return html;
}

function applyAgenda(row, sessions, { candidate = false } = {}) {
  row.starts_at = sessions[0].starts_at;
  row.ends_at = sessions.at(-1).ends_at;
  row.city = 'Riyadh';
  row.venue = 'JW Marriott Hotel Riyadh';
  if (candidate) delete row.venue_address;
  else row.venue_address = 'JW Marriott Hotel Riyadh, Riyadh, Saudi Arabia';
  if (candidate) row.category = 'conference';
  else assignEventCategory(row, row.raw_category || 'conference');
  row.organizer = 'Tradepass';
  row.audiences = ['professionals', 'tech', 'entrepreneurs', 'researchers'];
  row.tags = ['artificial intelligence', 'data', 'analytics', 'technology', 'leadership', 'conference'];
  row.summary = 'تجمع قمة Smart Data & AI قادة البيانات والذكاء الاصطناعي في الرياض يومي 26 و27 أغسطس 2026، بأجندة رسمية تناقش الذكاء الوكيلي وحوكمة البيانات والتحليلات والمدن الذكية.';
  row.sessions = sessions;
  if (candidate) {
    row.extracted_sessions_count = sessions.length;
    return;
  }
  const venueQuery = encodeURIComponent('JW Marriott Hotel Riyadh Saudi Arabia');
  row.source_label = 'Smart Data & AI Summit Official';
  row.source_url = eventUrl;
  row.evidence_url = agendaUrl;
  row.source_confidence = 'approved-source';
  row.url = agendaUrl;
  row.maps_url = `https://www.google.com/maps/search/?api=1&query=${venueQuery}`;
  row.directions_url = `https://www.google.com/maps/dir/?api=1&destination=${venueQuery}`;
  row.sessions_count = sessions.length;
  row.rooms_count = 1;
  row.tracks_count = 1;
  row.live_schedule_ready = sessions.length >= 3;
  row.updated_at = generatedAt;
  row.highlights = [
    `${sessions.length} فقرة رسمية بوقت بداية ونهاية`,
    'يومان من قضايا البيانات والذكاء الاصطناعي التطبيقية',
    'المكان الرسمي: JW Marriott Hotel Riyadh',
    'تتغير حالة كل فقرة تلقائيًا بتوقيت الرياض'
  ];
  row.program_outline = {
    ...(row.program_outline && typeof row.program_outline === 'object' ? row.program_outline : {}),
    provider: 'Tradepass',
    source_method: 'official-static-agenda',
    source_url: agendaUrl,
    collected_at: generatedAt,
    official_description: `الأجندة الرسمية لقمة Smart Data & AI 2026: ${sessions.length} فقرة موزعة على يومين.`,
    duration_text: '26 و27 أغسطس 2026',
    event_source: eventUrl,
    goals: [
      'مساعدة الزائر على اختيار جلسات البيانات والذكاء الاصطناعي الأنسب قبل الوصول.',
      'عرض الفقرة الجارية والتالية لحظة بلحظة بحسب توقيت الرياض.',
      'إبقاء كل فقرة مرتبطة بالأجندة الرسمية التي نشرها المنظم.'
    ],
    features: [`${sessions.length} فقرة بوقت بداية ونهاية`, 'بحث فوري داخل الأجندة', 'حالة الآن والتالي بتوقيت الرياض'],
    requirements: ['راجع الأجندة الرسمية قبل الوصول لاحتمال تحديث التوقيت أو عنوان الفقرة.'],
    faqs: {
      source_scope: 'Smart Data & AI Summit official event and agenda pages.',
      city: 'Riyadh',
      venue: 'JW Marriott Hotel Riyadh',
      agenda_scope: 'All timed items published for Day 1 and Day 2.',
      timezone_policy: 'Published wall-clock times are normalized to Asia/Riyadh.',
      live_schedule_status: `${sessions.length} official timed items available.`
    }
  };
  normalizeEventCategoryMetadata(row);
}

const catalog = readJson(catalogPath, { events: [] });
const candidates = readJson(candidatesPath, { candidates: [] });
const catalogRows = (catalog.events || []).filter(isTarget);
const candidateRows = (candidates.candidates || []).filter(isTarget);
let sessions = [];
let fetchError = '';

try {
  const html = await fetchHtml(agendaUrl);
  sessions = parseSmartDataAgendaHtml(html, { sourceUrl: agendaUrl });
  if (sessions.length < 20) throw new Error(`official agenda yielded only ${sessions.length} valid sessions`);
  const snapshotPath = path.join(root, 'data', 'raw', 'source-snapshots', 'smart-data-2026-agenda-latest.html');
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, html, 'utf8');
  for (const row of catalogRows) applyAgenda(row, sessions);
  for (const row of candidateRows) applyAgenda(row, sessions, { candidate: true });
  writeJson(catalogPath, catalog);
  writeJson(candidatesPath, candidates);
} catch (error) {
  fetchError = String(error?.message || error);
}

const report = {
  generated_at: generatedAt,
  agenda_url: agendaUrl,
  totals: {
    catalog_targets: catalogRows.length,
    candidate_targets: candidateRows.length,
    sessions: sessions.length,
    days: new Set(sessions.map((session) => session.starts_at.slice(0, 10))).size
  },
  fetch_error: fetchError
};
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# Smart Data & AI Summit 2026 Agenda Enrichment', '',
  `- generated_at: ${generatedAt}`,
  `- catalog_targets: ${report.totals.catalog_targets}`,
  `- candidate_targets: ${report.totals.candidate_targets}`,
  `- official_sessions: ${report.totals.sessions}`,
  `- days: ${report.totals.days}`,
  `- fetch_error: ${fetchError || 'none'}`,
  `- source: ${agendaUrl}`, ''
].join('\n'), 'utf8');

console.log('# EventLive Smart Data & AI Summit Agenda Enrichment');
console.log(`- Catalog targets: ${report.totals.catalog_targets}`);
console.log(`- Candidate targets: ${report.totals.candidate_targets}`);
console.log(`- Official sessions: ${report.totals.sessions}`);
console.log(`- Days: ${report.totals.days}`);
console.log(`- Fetch error: ${fetchError || 'none'}`);
