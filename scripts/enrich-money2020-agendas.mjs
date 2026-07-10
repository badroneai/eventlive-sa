import fs from 'node:fs';
import path from 'node:path';
import { parseMoney2020AgendaHtml } from './money2020-agenda-utils.mjs';

const root = process.cwd();
const officialBase = 'https://money2020middleeast.com';
const agenda2025Url = `${officialBase}/2025-agenda`;
const event2026Url = `${officialBase}/`;
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const endedPath = path.join(root, 'data', 'source_ended_events.json');
const reportJsonPath = path.join(root, 'reports', 'money2020-agenda-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'money2020-agenda-enrichment-report.md');
const generatedAt = new Date().toISOString();

function readJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 EventLive/1.0 (+https://eventme.live/)' },
    signal: AbortSignal.timeout(45000),
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  const html = await response.text();
  if (/attention required|access denied|cloudflare/i.test(html.slice(0, 12000))) throw new Error(`${url} returned a protection page`);
  return html;
}

function isMoney2026(row = {}) {
  return /Money\s*20\/?20\s+Middle East/i.test(String(row.title || '')) && String(row.starts_at || '').startsWith('2026-09-14');
}

function apply2026Identity(row, sessions, { candidate = false } = {}) {
  row.city = 'Riyadh';
  row.venue = 'Riyadh Exhibition & Convention Center, Malham';
  if (candidate) delete row.venue_address;
  else row.venue_address = 'Malham, Riyadh, Saudi Arabia';
  row.category = 'conference';
  row.organizer = 'Tahaluf';
  row.audiences = ['professionals', 'tech', 'entrepreneurs'];
  row.tags = ['fintech', 'banking', 'payments', 'investment', 'technology', 'conference'];
  row.summary = 'يجمع Money20/20 Middle East منظومة التقنية المالية العالمية في الرياض من 14 إلى 16 سبتمبر 2026، بمشاركة البنوك وشركات التقنية المالية والمستثمرين والجهات التنظيمية.';
  if (sessions.length) {
    row.sessions = sessions;
    if (candidate) row.extracted_sessions_count = sessions.length;
  }
  if (candidate) return;
  const secondaryEvidence = row.evidence_url || row.source_url || '';
  const venueQuery = encodeURIComponent('Riyadh Exhibition & Convention Center Malham Riyadh Saudi Arabia');
  row.source_label = 'Money20/20 Middle East Official';
  row.source_url = event2026Url;
  row.evidence_url = secondaryEvidence;
  row.maps_url = `https://www.google.com/maps/search/?api=1&query=${venueQuery}`;
  row.directions_url = `https://www.google.com/maps/dir/?api=1&destination=${venueQuery}`;
  row.updated_at = generatedAt;
  if (sessions.length) {
    const rooms = unique(sessions.map((session) => session.room));
    row.sessions_count = sessions.length;
    row.rooms_count = rooms.length;
    row.live_schedule_ready = true;
    row.program_outline = {
      provider: 'Tahaluf',
      source_method: 'official-public-agenda',
      source_url: sessions[0].source_url,
      collected_at: generatedAt,
      official_description: `الأجندة الرسمية لـMoney20/20 Middle East 2026: ${sessions.length} جلسة مكتملة الوقت.`,
      duration_text: '14 إلى 16 سبتمبر 2026',
      features: [`${sessions.length} جلسة بوقت بداية ونهاية`, `${rooms.length} مسرحًا وقاعة`, 'تحديث حي لحالة الجلسات بتوقيت الرياض'],
      requirements: ['راجع الأجندة الرسمية قبل الحضور لاحتمال تحديث القاعة أو المتحدث أو التوقيت.']
    };
  }
}

function ended2025Record(sessions) {
  const startsAt = sessions[0]?.starts_at || '2025-09-14T15:00:00+03:00';
  const endsAt = '2025-09-17T19:00:00+03:00';
  const rooms = unique(sessions.map((session) => session.room));
  return {
    id: 'ended-money2020-middle-east-2025',
    title: 'Money20/20 Middle East 2025',
    organizer: 'Tahaluf',
    city: 'Riyadh',
    venue: 'Riyadh Exhibition & Convention Center, Malham',
    venue_address: 'Malham, Riyadh, Saudi Arabia',
    category: 'conference',
    summary: 'النسخة الافتتاحية من Money20/20 Middle East في الرياض، محفوظة ببرنامجها الرسمي الكامل للجلسات والمتحدثين والقاعات.',
    starts_at: startsAt,
    ends_at: endsAt,
    source_type: 'official-site',
    source_url: agenda2025Url,
    source_label: 'Money20/20 Middle East Official',
    source_owner: 'Tahaluf',
    evidence_url: agenda2025Url,
    discovered_at: generatedAt,
    discovery_method: 'official-public-agenda',
    confidence: 'official',
    approval_status: 'published',
    publication_gate: 'auto-publish-official',
    sessions,
    extracted_sessions_count: sessions.length,
    sessions_count: sessions.length,
    rooms_count: rooms.length,
    live_schedule_ready: true,
    tags: ['fintech', 'banking', 'payments', 'investment', 'technology', 'conference'],
    audiences: ['professionals', 'tech', 'entrepreneurs'],
    ended_event_status: 'ended-before-latest-collection',
    collected_for: 'normal-ended-event-catalog',
    collected_at: generatedAt,
    historical_year: '2025',
    first_collected_at: generatedAt,
    reviewer_notes: 'Official first-party agenda retained as a normal ended event with the same live schedule experience used for current events.'
  };
}

const catalog = readJson(catalogPath, { events: [] });
const candidates = readJson(candidatesPath, { candidates: [] });
const ended = readJson(endedPath, { ended_events: [] });
let sessions2025 = [];
let sessions2026 = [];
let agenda2026Url = '';
const errors = [];

try {
  const html = await fetchHtml(agenda2025Url);
  sessions2025 = parseMoney2020AgendaHtml(html, {
    year: 2025,
    windowStart: '2025-09-14T00:00:00+03:00',
    windowEnd: '2025-09-18T00:00:00+03:00',
    idPrefix: 'money2020-2025',
    sourceUrl: agenda2025Url
  });
  if (sessions2025.length < 20) throw new Error(`2025 official agenda yielded only ${sessions2025.length} sessions`);
  const snapshotPath = path.join(root, 'data', 'raw', 'source-snapshots', 'money2020-2025-agenda-latest.html');
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, html, 'utf8');
  const record = ended2025Record(sessions2025);
  const index = (ended.ended_events || []).findIndex((row) => row.id === record.id);
  if (index === -1) ended.ended_events.push(record);
  else ended.ended_events[index] = { ...ended.ended_events[index], ...record, first_collected_at: ended.ended_events[index].first_collected_at || record.first_collected_at };
} catch (error) {
  errors.push(String(error?.message || error));
}

try {
  const homepage = await fetchHtml(event2026Url);
  const discovered = [...homepage.matchAll(/href=["']([^"']*(?:agenda|programme|program|schedule)[^"']*)["']/gi)]
    .map((match) => new URL(match[1], event2026Url).href)
    .filter((url) => /2026/i.test(url));
  const probes = unique([`${officialBase}/2026-agenda`, `${officialBase}/our-2026-agenda`, ...discovered]);
  for (const url of probes) {
    try {
      const html = await fetchHtml(url);
      const parsed = parseMoney2020AgendaHtml(html, {
        year: 2026,
        windowStart: '2026-09-13T00:00:00+03:00',
        windowEnd: '2026-09-17T00:00:00+03:00',
        idPrefix: 'money2020-2026',
        sourceUrl: url
      });
      if (parsed.length >= 3) {
        sessions2026 = parsed;
        agenda2026Url = url;
        break;
      }
    } catch {}
  }
} catch (error) {
  errors.push(String(error?.message || error));
}

for (const row of (catalog.events || []).filter(isMoney2026)) apply2026Identity(row, sessions2026);
for (const row of (candidates.candidates || []).filter(isMoney2026)) apply2026Identity(row, sessions2026, { candidate: true });
writeJson(catalogPath, catalog);
writeJson(candidatesPath, candidates);
writeJson(endedPath, ended);

const report = {
  generated_at: generatedAt,
  totals: {
    sessions_2025: sessions2025.length,
    rooms_2025: unique(sessions2025.map((session) => session.room)).length,
    sessions_2026: sessions2026.length,
    current_catalog_targets: (catalog.events || []).filter(isMoney2026).length,
    current_candidate_targets: (candidates.candidates || []).filter(isMoney2026).length
  },
  agenda_2025_url: agenda2025Url,
  agenda_2026_url: agenda2026Url,
  agenda_2026_status: sessions2026.length ? 'published-and-ingested' : 'not-published-yet',
  errors
};
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# Money20/20 Middle East Agenda Enrichment', '',
  `- generated_at: ${generatedAt}`,
  `- 2025_official_sessions: ${report.totals.sessions_2025}`,
  `- 2025_rooms: ${report.totals.rooms_2025}`,
  `- 2026_official_sessions: ${report.totals.sessions_2026}`,
  `- 2026_agenda_status: ${report.agenda_2026_status}`,
  `- 2026_agenda_url: ${agenda2026Url || 'watching official routes'}`,
  `- errors: ${errors.length ? errors.join(' | ') : 'none'}`, ''
].join('\n'), 'utf8');

console.log('# EventLive Money20/20 Agenda Enrichment');
console.log(`- 2025 official sessions: ${report.totals.sessions_2025}`);
console.log(`- 2025 rooms: ${report.totals.rooms_2025}`);
console.log(`- 2026 official sessions: ${report.totals.sessions_2026}`);
console.log(`- 2026 agenda status: ${report.agenda_2026_status}`);
console.log(`- Errors: ${errors.length ? errors.join(' | ') : 'none'}`);
