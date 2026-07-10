import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from 'playwright';
import { parseRffAgendaRows } from './rff-agenda-utils.mjs';

const root = process.cwd();
const eventUrl = 'https://www.therff.com/';
const agendaUrl = 'https://www.therff.com/agenda';
const endedPath = path.join(root, 'data', 'source_ended_events.json');
const reportJsonPath = path.join(root, 'reports', 'rff-agenda-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'rff-agenda-enrichment-report.md');
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

async function renderedAgenda() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36 EventLive/1.0',
      viewport: { width: 1440, height: 1000 }
    });
    await page.goto(agendaUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('.wixui-repeater__item', { timeout: 25_000 });
    await page.waitForTimeout(750);
    const html = await page.content();
    const rows = await page.evaluate(() => {
      const repeaters = [...document.querySelectorAll('.wixui-repeater')];
      const agendaRepeater = repeaters
        .map((repeater) => ({
          repeater,
          items: [...repeater.querySelectorAll(':scope [role="listitem"].wixui-repeater__item')]
            .filter((item) => /\d{1,2}:\d{2}\s*(?:-|–|—)\s*\d{1,2}:\d{2}/.test(item.innerText || '') && /Day\s+[123]/i.test(item.innerText || ''))
        }))
        .sort((a, b) => b.items.length - a.items.length)[0];
      return (agendaRepeater?.items || []).map((item) => ({
        text: item.innerText || '',
        url: item.querySelector('a[href*="youtu"], a[href*="youtube"]')?.href || location.href
      }));
    });
    return { html, rows };
  } finally {
    await browser.close();
  }
}

function endedRecord(sessions) {
  const tracks = unique(sessions.map((session) => session.track));
  return {
    id: 'ended-real-estate-future-forum-2026',
    title: 'Real Estate Future Forum 2026',
    organizer: 'Real Estate Future Forum',
    city: 'Riyadh',
    venue: 'Four Seasons Hotel Riyadh',
    venue_address: 'Kingdom Centre, Riyadh, Saudi Arabia',
    category: 'conference',
    summary: 'انعقد منتدى مستقبل العقار 2026 في الرياض من 26 إلى 28 يناير، ويُحفظ هنا ببرنامجه الرسمي الكامل للجلسات والحلقات النقاشية وروابط التسجيلات التي نشرها المنظم.',
    starts_at: sessions[0]?.starts_at || '2026-01-26T09:00:00+03:00',
    ends_at: sessions.at(-1)?.ends_at || '2026-01-28T18:00:00+03:00',
    source_type: 'official-site',
    source_url: eventUrl,
    source_label: 'Real Estate Future Forum Official',
    source_owner: 'Real Estate Future Forum',
    evidence_url: agendaUrl,
    discovered_at: generatedAt,
    discovery_method: 'official-rendered-agenda',
    confidence: 'official',
    approval_status: 'published',
    publication_gate: 'auto-publish-official',
    sessions,
    extracted_sessions_count: sessions.length,
    sessions_count: sessions.length,
    rooms_count: 1,
    tracks_count: tracks.length,
    live_schedule_ready: true,
    tags: ['real estate', 'investment', 'regulation', 'conference', 'Saudi Vision 2030'],
    audiences: ['professionals', 'entrepreneurs'],
    highlights: [`${sessions.length} جلسة رسمية عبر ثلاثة أيام`, `${tracks.length} أنواع من الجلسات`, 'روابط تسجيلات رسمية حيث نشرها المنظم'],
    ended_event_status: 'ended-before-latest-collection',
    collected_for: 'normal-ended-event-catalog',
    collected_at: generatedAt,
    historical_year: '2026',
    first_collected_at: generatedAt,
    program_outline: {
      provider: 'Real Estate Future Forum',
      source_method: 'official-rendered-agenda',
      source_url: agendaUrl,
      collected_at: generatedAt,
      official_description: `برنامج منتدى مستقبل العقار 2026 الرسمي: ${sessions.length} جلسة مكتملة الوقت عبر ثلاثة أيام.`,
      duration_text: '26 إلى 28 يناير 2026',
      features: [`${sessions.length} جلسة بوقت بداية ونهاية`, 'بحث وتصفية حسب اليوم', 'روابط التسجيلات الرسمية المتاحة'],
      requirements: ['هذه نسخة منتهية محفوظة كما نُشرت في أجندة المنظم الرسمية.']
    },
    reviewer_notes: 'The official agenda page still exposes the completed RFF 2026 programme. It is deliberately isolated from the separately announced RFF 2027 event.'
  };
}

const ended = readJson(endedPath, { ended_events: [] });
let sessions = [];
let fetchError = '';
let rowsCount = 0;

try {
  const rendered = await renderedAgenda();
  rowsCount = rendered.rows.length;
  sessions = parseRffAgendaRows(rendered.rows, { sourceUrl: agendaUrl });
  if (sessions.length < 20) throw new Error(`official agenda yielded only ${sessions.length} valid sessions from ${rowsCount} rows`);
  const snapshotPath = path.join(root, 'data', 'raw', 'source-snapshots', 'rff-2026-agenda-latest.html.gz');
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, zlib.gzipSync(rendered.html, { level: 9 }));
  const record = endedRecord(sessions);
  const index = (ended.ended_events || []).findIndex((row) => row.id === record.id);
  if (index === -1) ended.ended_events.push(record);
  else ended.ended_events[index] = { ...ended.ended_events[index], ...record, first_collected_at: ended.ended_events[index].first_collected_at || record.first_collected_at };
  writeJson(endedPath, ended);
} catch (error) {
  fetchError = String(error?.message || error);
}

const report = {
  generated_at: generatedAt,
  agenda_url: agendaUrl,
  current_event_policy: 'RFF 2027 remains separate until its own official agenda is published.',
  totals: {
    rendered_rows: rowsCount,
    sessions_2026: sessions.length,
    days: new Set(sessions.map((session) => session.starts_at.slice(0, 10))).size,
    recorded_session_links: sessions.filter((session) => /youtu/i.test(session.source_url || '')).length
  },
  fetch_error: fetchError
};
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# Real Estate Future Forum 2026 Agenda Enrichment', '',
  `- generated_at: ${generatedAt}`,
  `- rendered_rows: ${report.totals.rendered_rows}`,
  `- official_sessions_2026: ${report.totals.sessions_2026}`,
  `- days: ${report.totals.days}`,
  `- recorded_session_links: ${report.totals.recorded_session_links}`,
  `- RFF_2027_policy: ${report.current_event_policy}`,
  `- fetch_error: ${fetchError || 'none'}`,
  `- source: ${agendaUrl}`, ''
].join('\n'), 'utf8');

console.log('# EventLive Real Estate Future Forum Agenda Enrichment');
console.log(`- Rendered rows: ${report.totals.rendered_rows}`);
console.log(`- Official 2026 sessions: ${report.totals.sessions_2026}`);
console.log(`- Days: ${report.totals.days}`);
console.log(`- Recorded session links: ${report.totals.recorded_session_links}`);
console.log(`- RFF 2027: kept separate until its own agenda is published`);
console.log(`- Fetch error: ${fetchError || 'none'}`);
