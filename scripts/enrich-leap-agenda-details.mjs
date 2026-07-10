import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { parseLeapAgendaHtml } from './leap-agenda-utils.mjs';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'events_catalog.json');
const candidatesPath = path.join(root, 'data', 'source_candidates.json');
const reportJsonPath = path.join(root, 'reports', 'leap-agenda-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'leap-agenda-enrichment-report.md');
const agendaUrl = 'https://onegiantleap.com/our-2026-agenda?field_swapcard_session_day_value=all';
const eventUrl = 'https://onegiantleap.com/';
const faqUrl = 'https://onegiantleap.com/faq';
const generatedAt = new Date().toISOString();

function readJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function isLeap2026(row = {}) {
  return /^LEAP\s+2026$/i.test(String(row.title || '').trim())
    && String(row.starts_at || '').startsWith('2026-08-31');
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

async function renderedAgendaHtml() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 1000 }
    });
    await page.goto(agendaUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const title = await page.title();
    const html = await page.content();
    if (/cloudflare|attention required|access denied/i.test(`${title}\n${html.slice(0, 12000)}`)) {
      throw new Error('official agenda returned a protection page');
    }
    return html;
  } finally {
    await browser.close();
  }
}

function applyAgenda(row, sessions, { candidate = false } = {}) {
  const rooms = unique(sessions.map((session) => session.room));
  const tracks = unique(sessions.map((session) => session.track));
  row.starts_at = '2026-08-31T11:00:00+03:00';
  row.ends_at = '2026-09-03T21:00:00+03:00';
  row.city = 'Riyadh';
  row.venue = 'Riyadh Exhibition & Convention Centre, Malham';
  if (candidate) delete row.venue_address;
  else row.venue_address = 'Malham, Riyadh, Saudi Arabia';
  row.category = 'conference';
  row.audiences = ['professionals', 'tech', 'entrepreneurs', 'students'];
  row.tags = ['technology', 'conference', 'artificial intelligence', 'startups', 'investment', 'innovation'];
  row.organizer = 'Tahaluf';
  row.summary = 'يجمع مؤتمر LEAP 2026 في الرياض قادة التقنية والشركات الناشئة والمستثمرين وصناع السياسات والمبتكرين من 31 أغسطس إلى 3 سبتمبر 2026، مع جدول حي موثق للجلسات والقاعات.';
  row.sessions = sessions;
  if (candidate) {
    row.extracted_sessions_count = sessions.length;
    delete row.sessions_count;
    delete row.rooms_count;
    delete row.tracks_count;
    delete row.live_schedule_ready;
    delete row.updated_at;
    delete row.program_outline;
    return;
  }
  delete row.extracted_sessions_count;
  const secondaryEvidenceUrl = row.evidence_url || row.source_url || '';
  const venueQuery = encodeURIComponent('Riyadh Exhibition & Convention Centre Malham Riyadh Saudi Arabia');
  row.source_label = 'LEAP 2026 Official';
  row.source_url = eventUrl;
  row.evidence_url = secondaryEvidenceUrl;
  row.maps_url = `https://www.google.com/maps/search/?api=1&query=${venueQuery}`;
  row.directions_url = `https://www.google.com/maps/dir/?api=1&destination=${venueQuery}`;
  row.sessions_count = sessions.length;
  row.rooms_count = rooms.length;
  row.tracks_count = tracks.length;
  row.live_schedule_ready = sessions.length >= 3;
  row.url = agendaUrl;
  row.updated_at = generatedAt;
  row.highlights = [
    `${sessions.length} جلسة رسمية منشورة في أجندة LEAP 2026`,
    `${rooms.length} مسرحًا وقاعة`,
    `${tracks.length} نوعًا ومسارًا برامجيًا`,
    'مركز الرياض للمعارض والمؤتمرات في ملهم',
    'ساعات استقبال الجمهور من 12 ظهرًا إلى 9 مساءً يوميًا'
  ];
  row.program_outline = {
    ...(row.program_outline && typeof row.program_outline === 'object' ? row.program_outline : {}),
    provider: 'Tahaluf',
    source_method: 'official-rendered-agenda',
    source_url: agendaUrl,
    collected_at: generatedAt,
    official_description: `الأجندة الرسمية لـLEAP 2026: ${sessions.length} جلسة مكتملة الوقت ضمن 31 أغسطس إلى 3 سبتمبر 2026.`,
    duration_text: '31 أغسطس إلى 3 سبتمبر 2026',
    public_opening_hours: '12:00 PM to 9:00 PM daily',
    venue_source: faqUrl,
    event_source: eventUrl,
    founding_partners: ['MCIT', 'SAFCSP', 'Tahaluf'],
    goals: [
      'مساعدة الزائر على اختيار الجلسات المناسبة قبل الوصول إلى مقر LEAP.',
      'عرض حالة كل جلسة وموعدها وقاعتها بحسب توقيت الرياض.',
      'ربط كل جلسة بصفحتها المنشورة في الأجندة الرسمية.'
    ],
    features: [
      `${sessions.length} جلسة بوقت بداية ونهاية`,
      `${rooms.length} قاعة ومسرح`,
      `${tracks.length} نوعًا برامجيًا`,
      'تتغير حالة كل جلسة تلقائيًا بين قادمة وجارية ومنتهية بتوقيت الرياض'
    ],
    requirements: [
      'ساعات استقبال الجمهور من 12 ظهرًا إلى 9 مساءً يوميًا.',
      'راجع الأجندة الرسمية قبل الحضور لاحتمال تحديث القاعة أو المتحدث أو التوقيت.'
    ],
    faqs: {
      source_scope: 'LEAP 2026 official event and agenda pages, with Visit Saudi retained as secondary evidence.',
      city: 'Riyadh',
      venue: 'Riyadh Exhibition & Convention Centre, Malham',
      category: 'Global technology event and conference',
      agenda_source: agendaUrl,
      agenda_scope: 'Only sessions dated 31 August through 3 September 2026 are accepted.',
      timezone_policy: 'Published wall-clock times are normalized to Asia/Riyadh.',
      live_schedule_status: `${sessions.length} official timed sessions available.`
    }
  };
}

const catalog = readJson(catalogPath, { events: [] });
const candidatePayload = readJson(candidatesPath, { candidates: [] });
const catalogRows = (catalog.events || []).filter(isLeap2026);
const candidateRows = (candidatePayload.candidates || []).filter(isLeap2026);
let sessions = [];
let fetchError = '';
let snapshotPath = '';

try {
  const html = await renderedAgendaHtml();
  sessions = parseLeapAgendaHtml(html);
  if (sessions.length < 3) throw new Error(`official agenda yielded only ${sessions.length} valid sessions`);
  snapshotPath = path.join('data', 'raw', 'source-snapshots', 'leap-2026-agenda-latest.html');
  fs.mkdirSync(path.dirname(path.join(root, snapshotPath)), { recursive: true });
  fs.writeFileSync(path.join(root, snapshotPath), html, 'utf8');
  for (const row of catalogRows) applyAgenda(row, sessions);
  for (const row of candidateRows) applyAgenda(row, sessions, { candidate: true });
  writeJson(catalogPath, catalog);
  writeJson(candidatesPath, candidatePayload);
} catch (error) {
  fetchError = String(error?.message || error);
}

const report = {
  generated_at: generatedAt,
  agenda_url: agendaUrl,
  snapshot_path: snapshotPath,
  totals: {
    catalog_targets: catalogRows.length,
    candidate_targets: candidateRows.length,
    sessions: sessions.length,
    rooms: unique(sessions.map((session) => session.room)).length,
    tracks: unique(sessions.map((session) => session.track)).length
  },
  fetch_error: fetchError
};
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# LEAP 2026 Agenda Enrichment',
  '',
  `- generated_at: ${generatedAt}`,
  `- catalog_targets: ${report.totals.catalog_targets}`,
  `- candidate_targets: ${report.totals.candidate_targets}`,
  `- official_sessions: ${report.totals.sessions}`,
  `- rooms: ${report.totals.rooms}`,
  `- tracks: ${report.totals.tracks}`,
  `- fetch_error: ${fetchError || 'none'}`,
  `- source: ${agendaUrl}`,
  ''
].join('\n'), 'utf8');

console.log('# EventLive LEAP 2026 Agenda Enrichment');
console.log(`- Catalog targets: ${report.totals.catalog_targets}`);
console.log(`- Candidate targets: ${report.totals.candidate_targets}`);
console.log(`- Official sessions: ${report.totals.sessions}`);
console.log(`- Rooms: ${report.totals.rooms}`);
console.log(`- Tracks: ${report.totals.tracks}`);
console.log(`- Fetch error: ${fetchError || 'none'}`);
