import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { parseGlobalProptechAgendaText } from './global-proptech-agenda-utils.mjs';

const root = process.cwd();
const eventUrl = 'https://globalproptechsummit.com/';
const agendaUrl = 'https://globalproptechsummit.com/agenda.pdf';
const endedPath = path.join(root, 'data', 'source_ended_events.json');
const reportJsonPath = path.join(root, 'reports', 'global-proptech-agenda-enrichment-report.json');
const reportMdPath = path.join(root, 'reports', 'global-proptech-agenda-enrichment-report.md');
const generatedAt = new Date().toISOString();

function readJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function downloadOfficialAgenda(pdfPath) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 1000 } });
    await page.goto(eventUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const link = page.locator('a[href$="agenda.pdf"]').first();
    await link.waitFor({ timeout: 20_000 });
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    await download.saveAs(pdfPath);
  } finally {
    await browser.close();
  }
}

function endedRecord(sessions) {
  return {
    id: 'ended-global-proptech-summit-2025',
    title: 'Global PropTech Summit 2025',
    organizer: 'Global PropTech Summit',
    city: 'Riyadh',
    venue: 'Mandarin Oriental Al Faisaliah',
    venue_address: 'Al Faisaliah Tower, Riyadh, Saudi Arabia',
    category: 'conference',
    summary: 'انعقدت القمة العالمية لتقنيات العقار 2025 في الرياض يومي 26 و27 أكتوبر، ويُحفظ برنامجها الرسمي هنا بجلساته عن الذكاء الاصطناعي والمدن الذكية والتنظيم والاستثمار العقاري.',
    starts_at: sessions[0]?.starts_at || '2025-10-26T09:00:00+03:00',
    ends_at: sessions.at(-1)?.ends_at || '2025-10-27T18:00:00+03:00',
    source_type: 'official-site',
    source_url: eventUrl,
    source_label: 'Global PropTech Summit Official',
    source_owner: 'Global PropTech Summit',
    evidence_url: agendaUrl,
    discovered_at: generatedAt,
    discovery_method: 'official-browser-pdf-agenda',
    confidence: 'official',
    approval_status: 'published',
    publication_gate: 'auto-publish-official',
    sessions,
    extracted_sessions_count: sessions.length,
    sessions_count: sessions.length,
    rooms_count: 1,
    tracks_count: 1,
    live_schedule_ready: true,
    tags: ['proptech', 'real estate', 'artificial intelligence', 'investment', 'conference'],
    audiences: ['professionals', 'tech', 'entrepreneurs'],
    highlights: [`${sessions.length} فقرة رسمية عبر يومين`, 'المصدر برنامج PDF رسمي من المنظم', 'موضوعات الذكاء الاصطناعي والتقنية العقارية والمدن الذكية'],
    ended_event_status: 'ended-before-latest-collection',
    collected_for: 'normal-ended-event-catalog',
    collected_at: generatedAt,
    historical_year: '2025',
    first_collected_at: generatedAt,
    program_outline: {
      provider: 'Global PropTech Summit',
      source_method: 'official-browser-pdf-agenda',
      source_url: agendaUrl,
      collected_at: generatedAt,
      official_description: `البرنامج الرسمي للقمة العالمية لتقنيات العقار 2025: ${sessions.length} فقرة مكتملة الوقت عبر يومين.`,
      duration_text: '26 و27 أكتوبر 2025',
      features: [`${sessions.length} فقرة بوقت بداية ونهاية`, 'بحث وتصفية حسب اليوم', 'مرجع تاريخي للبرنامج الرسمي'],
      requirements: ['هذه نسخة منتهية محفوظة من برنامج المنظم الرسمي.']
    },
    reviewer_notes: 'The public agenda link still points to the 2025 PDF while the homepage announces 2026. This record is deliberately isolated from Global PropTech Summit 2026.'
  };
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventlive-proptech-'));
const pdfPath = path.join(tempDir, 'agenda.pdf');
const textPath = path.join(tempDir, 'agenda.txt');
const ended = readJson(endedPath, { ended_events: [] });
let sessions = [];
let pdfBytes = 0;
let fetchError = '';

try {
  await downloadOfficialAgenda(pdfPath);
  pdfBytes = fs.statSync(pdfPath).size;
  execFileSync('pdftotext', ['-layout', pdfPath, textPath], { stdio: 'pipe' });
  const text = fs.readFileSync(textPath, 'utf8');
  if (!/26-27 OCT 2025|26 OCT[\s\S]*27 OCT/i.test(text)) throw new Error('official PDF does not identify the 2025 programme');
  sessions = parseGlobalProptechAgendaText(text, { sourceUrl: agendaUrl });
  if (sessions.length < 25) throw new Error(`official PDF yielded only ${sessions.length} valid sessions`);
  const record = endedRecord(sessions);
  const index = (ended.ended_events || []).findIndex((row) => row.id === record.id);
  if (index === -1) ended.ended_events.push(record);
  else ended.ended_events[index] = { ...ended.ended_events[index], ...record, first_collected_at: ended.ended_events[index].first_collected_at || record.first_collected_at };
  writeJson(endedPath, ended);
} catch (error) {
  fetchError = String(error?.message || error);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

const report = {
  generated_at: generatedAt,
  agenda_url: agendaUrl,
  current_event_policy: 'The 2026 event remains separate; its homepage is monitored until a 2026 agenda replaces the historical PDF.',
  totals: { sessions_2025: sessions.length, pdf_bytes: pdfBytes, days: new Set(sessions.map((session) => session.starts_at.slice(0, 10))).size },
  fetch_error: fetchError
};
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, [
  '# Global PropTech Summit 2025 Agenda Enrichment', '',
  `- generated_at: ${generatedAt}`,
  `- official_sessions_2025: ${report.totals.sessions_2025}`,
  `- days: ${report.totals.days}`,
  `- downloaded_pdf_bytes: ${report.totals.pdf_bytes}`,
  `- 2026_policy: ${report.current_event_policy}`,
  `- fetch_error: ${fetchError || 'none'}`,
  `- source: ${agendaUrl}`, ''
].join('\n'), 'utf8');

console.log('# EventLive Global PropTech Summit Agenda Import');
console.log(`- Official 2025 sessions: ${report.totals.sessions_2025}`);
console.log(`- Days: ${report.totals.days}`);
console.log(`- PDF bytes: ${report.totals.pdf_bytes}`);
console.log('- 2026 event: kept separate and monitored for its own agenda');
console.log(`- Fetch error: ${fetchError || 'none'}`);
