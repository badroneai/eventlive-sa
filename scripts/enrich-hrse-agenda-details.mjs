import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from 'playwright';
import { parseHrseAgendaHtml } from './hrse-agenda-utils.mjs';

const root = process.cwd();
const officialBase = 'https://informaconnect.com/hrse-saudi/';
const agendaDays = [
  { page: 1, date: '2026-08-30', type: 'official-workshop-session' },
  { page: 2, date: '2026-08-31', type: 'official-workshop-session' },
  { page: 3, date: '2026-09-01', type: 'official-program-session' },
  { page: 4, date: '2026-09-02', type: 'official-program-session' }
];
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const reportJsonPath = path.join(root, 'reports', 'hrse-agenda-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'hrse-agenda-enrichment-report.md');
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

function isHrse2026(row = {}) {
  return String(row.id || '') === 'event-hrse-ksa'
    || (/^HRSE\s+KSA$/i.test(String(row.title || '').trim()) && String(row.starts_at || '').startsWith('2026-08-30'));
}

async function renderedAgendaPages() {
  const browser = await chromium.launch({ headless: true });
  const pages = [];
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36 EventLive/1.0',
      viewport: { width: 1440, height: 1000 }
    });
    for (const day of agendaDays) {
      const url = `${officialBase}agenda/${day.page}/`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForSelector('.agenda-sessions', { timeout: 25_000 });
      const html = await page.content();
      const title = await page.title();
      if (/cloudflare|attention required|access denied/i.test(`${title}\n${html.slice(0, 12000)}`)) {
        throw new Error(`${url} returned a protection page`);
      }
      pages.push({ ...day, url, html });
    }
    return pages;
  } finally {
    await browser.close();
  }
}

function applyAgenda(row, sessions, { candidate = false } = {}) {
  const rooms = unique(sessions.map((session) => session.room));
  const tracks = unique(sessions.map((session) => session.track));
  row.starts_at = sessions[0].starts_at;
  row.ends_at = sessions.at(-1).ends_at;
  row.city = 'Riyadh';
  row.venue = 'The Arena Riyadh';
  if (candidate) delete row.venue_address;
  else row.venue_address = 'The Arena Riyadh, Riyadh, Saudi Arabia';
  row.category = 'conference';
  row.organizer = 'Informa Connect';
  row.audiences = ['professionals', 'tech', 'entrepreneurs', 'students'];
  row.tags = ['human resources', 'leadership', 'workplace', 'technology', 'training', 'conference'];
  row.summary = 'تجمع HRSE KSA قادة الموارد البشرية والعمل والتقنية في الرياض، مع ورش معتمدة ومؤتمرات متخصصة وأجندة رسمية حية من 30 أغسطس إلى 2 سبتمبر 2026.';
  row.sessions = sessions;
  if (candidate) {
    row.extracted_sessions_count = sessions.length;
    return;
  }

  const venueQuery = encodeURIComponent('The Arena Riyadh Saudi Arabia');
  row.source_label = 'HRSE KSA Official';
  row.source_url = officialBase;
  row.evidence_url = `${officialBase}agenda/3/`;
  row.source_confidence = 'approved-source';
  row.maps_url = `https://www.google.com/maps/search/?api=1&query=${venueQuery}`;
  row.directions_url = `https://www.google.com/maps/dir/?api=1&destination=${venueQuery}`;
  row.url = `${officialBase}agenda/3/`;
  row.sessions_count = sessions.length;
  row.rooms_count = rooms.length;
  row.tracks_count = tracks.length;
  row.live_schedule_ready = sessions.length >= 3;
  row.updated_at = generatedAt;
  row.highlights = [
    `${sessions.length} جلسة وورشة رسمية بوقت بداية ونهاية`,
    `${rooms.length} مسارًا ومسرحًا`,
    'ورش معتمدة في 30 و31 أغسطس',
    'المؤتمر والمعرض في 1 و2 سبتمبر',
    'الحالة الزمنية لكل جلسة تتحدث تلقائيًا بتوقيت الرياض'
  ];
  row.program_outline = {
    ...(row.program_outline && typeof row.program_outline === 'object' ? row.program_outline : {}),
    provider: 'Informa Connect',
    source_method: 'official-rendered-agenda',
    source_url: `${officialBase}agenda/3/`,
    collected_at: generatedAt,
    official_description: `أجندة HRSE KSA 2026 الرسمية: ${sessions.length} جلسة وورشة موزعة على أربعة أيام.`,
    duration_text: '30 أغسطس إلى 2 سبتمبر 2026',
    event_source: officialBase,
    goals: [
      'تمكين الزائر من معرفة الجلسة الجارية والتالية أثناء الحدث.',
      'تصفية البرنامج حسب اليوم والمسار والبحث باسم الجلسة أو المتحدث.',
      'عرض جميع الأوقات حسب توقيت الرياض مع رابط المصدر الرسمي.'
    ],
    features: [`${sessions.length} جلسة وورشة`, `${rooms.length} مسارًا ومسرحًا`, 'أسماء المتحدثين حيث نشرها المنظم'],
    requirements: ['راجع الأجندة الرسمية قبل الوصول لاحتمال تحديث المسار أو المتحدث أو التوقيت.'],
    faqs: {
      source_scope: 'HRSE KSA official event and agenda pages.',
      city: 'Riyadh',
      venue: 'The Arena Riyadh',
      agenda_scope: 'Certified workshops and main conference sessions from 30 August through 2 September 2026.',
      timezone_policy: 'Published wall-clock times are normalized to Asia/Riyadh.',
      live_schedule_status: `${sessions.length} official timed sessions available.`
    }
  };
}

const catalog = readJson(catalogPath, { events: [] });
const candidates = readJson(candidatesPath, { candidates: [] });
const catalogRows = (catalog.events || []).filter(isHrse2026);
const candidateRows = (candidates.candidates || []).filter(isHrse2026);
let sessions = [];
let fetchError = '';
const pageTotals = [];

try {
  const pages = await renderedAgendaPages();
  sessions = pages.flatMap((page) => {
    const parsed = parseHrseAgendaHtml(page.html, {
      date: page.date,
      sourceUrl: page.url,
      idPrefix: 'hrse-2026',
      sessionType: page.type
    });
    pageTotals.push({ page: page.page, date: page.date, sessions: parsed.length });
    const snapshotPath = path.join(root, 'data', 'raw', 'source-snapshots', `hrse-2026-agenda-${page.page}-latest.html.gz`);
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, zlib.gzipSync(page.html, { level: 9 }));
    return parsed;
  });
  const deduped = new Map(sessions.map((session) => [`${session.starts_at}|${session.ends_at}|${session.title.toLowerCase()}|${session.room || ''}`, session]));
  sessions = [...deduped.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at) || (a.room || '').localeCompare(b.room || ''));
  if (sessions.length < 20) throw new Error(`official agenda yielded only ${sessions.length} valid sessions`);
  for (const row of catalogRows) applyAgenda(row, sessions);
  for (const row of candidateRows) applyAgenda(row, sessions, { candidate: true });
  writeJson(catalogPath, catalog);
  writeJson(candidatesPath, candidates);
} catch (error) {
  fetchError = String(error?.message || error);
}

const report = {
  generated_at: generatedAt,
  event_url: officialBase,
  agenda_pages: agendaDays.map((day) => `${officialBase}agenda/${day.page}/`),
  page_totals: pageTotals,
  totals: {
    catalog_targets: catalogRows.length,
    candidate_targets: candidateRows.length,
    sessions: sessions.length,
    rooms: unique(sessions.map((session) => session.room)).length,
    speakers: unique(sessions.flatMap((session) => String(session.speaker || '').split('،').map((value) => value.trim()))).length
  },
  fetch_error: fetchError
};
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# HRSE KSA 2026 Agenda Enrichment', '',
  `- generated_at: ${generatedAt}`,
  `- catalog_targets: ${report.totals.catalog_targets}`,
  `- candidate_targets: ${report.totals.candidate_targets}`,
  `- official_sessions: ${report.totals.sessions}`,
  `- streams: ${report.totals.rooms}`,
  `- named_speakers: ${report.totals.speakers}`,
  `- pages: ${pageTotals.map((row) => `${row.date}=${row.sessions}`).join(', ') || 'none'}`,
  `- fetch_error: ${fetchError || 'none'}`,
  `- source: ${officialBase}agenda/3/`, ''
].join('\n'), 'utf8');

console.log('# EventLive HRSE KSA 2026 Agenda Enrichment');
console.log(`- Catalog targets: ${report.totals.catalog_targets}`);
console.log(`- Candidate targets: ${report.totals.candidate_targets}`);
console.log(`- Official sessions: ${report.totals.sessions}`);
console.log(`- Streams: ${report.totals.rooms}`);
console.log(`- Named speakers: ${report.totals.speakers}`);
console.log(`- Fetch error: ${fetchError || 'none'}`);
