import fs from 'node:fs';
import path from 'node:path';
import { cleanAgendaText, inspectOfficialAgendaHtml } from './official-agenda-radar-utils.mjs';

const root = process.cwd();
const generatedAt = new Date().toISOString();
const reportJsonPath = path.join(root, 'reports', 'source-official-agenda-radar.json');
const reportMdPath = path.join(root, 'reports', 'source-official-agenda-radar.md');

const targets = [
  {
    id: 'leap-2026-agenda',
    event: 'LEAP 2026',
    url: 'https://onegiantleap.com/our-2026-agenda?field_swapcard_session_day_value=all',
    policy: 'public-browser-production-extractor',
    extractor: 'browser-active'
  },
  {
    id: 'money2020-2025-agenda',
    event: 'Money20/20 Middle East 2025',
    url: 'https://money2020middleeast.com/2025-agenda',
    policy: 'historical-production-extractor',
    extractor: 'historical-active'
  },
  {
    id: 'money2020-2026-agenda',
    event: 'Money20/20 Middle East 2026',
    url: 'https://money2020middleeast.com/2026-agenda',
    policy: 'watch-until-published'
  },
  {
    id: 'fii10-2026-program',
    event: 'Future Investment Initiative 10th Edition',
    url: 'https://fii-institute.org/conference/fii-10th-edition/',
    policy: 'watch-until-timed-program'
  },
  {
    id: 'sdaia-global-ai-summit-2026',
    event: 'Global AI Summit 2026',
    url: 'https://sdaia.gov.sa/en/MediaCenter/Events/Pages/EventsDetails.aspx?EventID=123',
    policy: 'watch-official-event-page'
  },
  {
    id: 'sdaia-ai-ethics-forum-2026',
    event: 'Global Forum on the Ethics of AI 2026',
    url: 'https://sdaia.gov.sa/en/MediaCenter/Events/Pages/EventsDetails.aspx?EventID=122',
    policy: 'watch-official-event-page'
  },
  {
    id: 'cityscape-global-2026',
    event: 'Cityscape Global 2026',
    url: 'https://cityscapeglobal.com/',
    policy: 'public-browser-or-partnership-only'
  },
  {
    id: 'xp-music-futures-2026',
    event: 'XP Music Futures 2026',
    url: 'https://mdlbeast.com/events/xp-music-futures-2026',
    policy: 'watch-official-event-page'
  },
  {
    id: 'global-water-sustainability-conference-2026',
    event: 'The Global Water Sustainability Conference 2026',
    url: 'https://www.swa.gov.sa/en/events/Event-639166882740331066',
    policy: 'watch-official-event-page'
  },
  {
    id: 'hrse-ksa-2026-agenda',
    event: 'HRSE KSA 2026',
    url: 'https://informaconnect.com/hrse-saudi/agenda/3/',
    policy: 'public-browser-production-extractor',
    extractor: 'browser-active'
  },
  {
    id: 'smart-data-ai-2026-agenda',
    event: 'Smart Data & AI Summit 2026',
    url: 'https://saudi.smartdataseries.com/agenda',
    policy: 'public-static-production-extractor',
    extractor: 'active'
  },
  {
    id: 'big5-construct-saudi-2026-agenda',
    event: 'Big 5 Construct Saudi 2026',
    url: 'https://www.big5constructsaudi.com/agenda/',
    policy: 'watch-until-timed-program'
  },
  {
    id: 'hvacr-saudi-2026-agenda',
    event: 'HVAC R Saudi Arabia 2026',
    url: 'https://www.big5constructsaudi.com/agenda/',
    policy: 'watch-shared-event-agenda'
  },
  {
    id: 'saudi-fm-clean-2026-agenda',
    event: 'Saudi FM & Clean 2026',
    url: 'https://www.big5constructsaudi.com/agenda/',
    policy: 'watch-shared-event-agenda'
  },
  {
    id: 'global-proptech-summit-2026-agenda',
    event: 'Global Proptech Summit 2026',
    url: 'https://globalproptechsummit.com/',
    policy: 'watch-homepage-until-2026-agenda-replaces-historical-pdf'
  },
  {
    id: 'real-estate-supply-chain-forum-2026-agenda',
    event: 'Real Estate Supply Chain Forum 2026',
    url: 'https://www.rscforum.com/agenda',
    policy: 'watch-until-timed-program'
  },
  {
    id: 'cips-mena-2026-agenda',
    event: 'CIPS MENA Conference and Awards 2026',
    url: 'https://www.cipsmenaconferenceandawards.com/agenda',
    policy: 'reject-placeholder-until-official-program'
  },
  {
    id: 'rff-2026-historical-agenda',
    event: 'Real Estate Future Forum 2026 historical programme',
    url: 'https://www.therff.com/agenda',
    policy: 'historical-production-extractor-keep-separate-from-2027',
    extractor: 'historical-active'
  }
];

function titleFrom(html = '') {
  return cleanAgendaText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
}

function agendaLinks(html = '', baseUrl = '') {
  const links = [...String(html || '').matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => {
      try { return new URL(match[1], baseUrl).href; } catch { return ''; }
    })
    .filter((url) => url && /agenda|programme|program|schedule|session/i.test(url));
  return [...new Set(links)].slice(0, 20);
}

async function probe(target) {
  const started = Date.now();
  try {
    const response = await fetch(target.url, {
      headers: { 'user-agent': 'Mozilla/5.0 EventLive/1.0 (+https://eventme.live/)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(45000)
    });
    const html = await response.text();
    const signals = inspectOfficialAgendaHtml(html, response);
    if (target.extractor === 'browser-active' && !['not-published', 'unavailable'].includes(signals.status)) {
      signals.status = 'published-browser-extractor-active';
    } else if (target.extractor === 'historical-active' && signals.status === 'published-timed-agenda') {
      signals.status = 'published-historical-extractor-active';
    } else if (target.extractor === 'active' && signals.status === 'published-timed-agenda') {
      signals.status = 'published-extractor-active';
    }
    return {
      ...target,
      checked_at: new Date().toISOString(),
      http_status: response.status,
      final_url: response.url,
      title: titleFrom(html),
      bytes: Buffer.byteLength(html),
      duration_ms: Date.now() - started,
      status: signals.status,
      signals,
      agenda_links: agendaLinks(html, response.url || target.url),
      error: ''
    };
  } catch (error) {
    return {
      ...target,
      checked_at: new Date().toISOString(),
      http_status: 0,
      final_url: target.url,
      title: '',
      bytes: 0,
      duration_ms: Date.now() - started,
      status: 'unavailable',
      signals: {},
      agenda_links: [],
      error: String(error?.message || error)
    };
  }
}

const rows = await Promise.all(targets.map(probe));
const counts = Object.fromEntries([...new Set(rows.map((row) => row.status))].sort().map((status) => [status, rows.filter((row) => row.status === status).length]));
const publishedReady = rows.filter((row) => row.status === 'published-timed-agenda' || /published-.*extractor-active/.test(row.status)).length;
const report = {
  schema: 'eventlive.official-agenda-radar.v1',
  generated_at: generatedAt,
  policy: 'Evidence and readiness radar only. It never publishes an event or session.',
  totals: { targets: rows.length, published_ready: publishedReady, ...counts },
  targets: rows
};
fs.mkdirSync(path.dirname(reportJsonPath), { recursive: true });
fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const table = rows.map((row) => `| ${row.event} | ${row.status} | ${row.http_status || '-'} | ${row.signals.completeRows || 0} | ${row.signals.agendaCards || 0} | ${row.policy} |`).join('\n');
fs.writeFileSync(reportMdPath, [
  '# EventLive Official Agenda Radar', '',
  `Generated at: ${generatedAt}`, '',
  'This radar detects when first-party event pages expose a complete timed programme. It does not publish records.', '',
  `- Targets: ${rows.length}`,
  `- Published timed agendas: ${publishedReady}`,
  `- Announced without timed agenda: ${counts['announced-no-timed-agenda'] || 0}`,
  `- Placeholder agendas rejected: ${counts['placeholder-not-publishable'] || 0}`,
  `- Not published: ${counts['not-published'] || 0}`,
  `- Protected or partnership: ${counts['protected-or-partnership'] || 0}`, '',
  '| Event | Status | HTTP | Complete time rows | Agenda cards | Policy |',
  '| --- | --- | ---: | ---: | ---: | --- |',
  table, ''
].join('\n'), 'utf8');

console.log('# EventLive Official Agenda Radar');
console.log(`- Targets: ${rows.length}`);
console.log(`- Published timed agendas: ${publishedReady}`);
console.log(`- Announced without timed agenda: ${counts['announced-no-timed-agenda'] || 0}`);
console.log(`- Placeholder agendas rejected: ${counts['placeholder-not-publishable'] || 0}`);
console.log(`- Not published: ${counts['not-published'] || 0}`);
console.log(`- Protected or partnership: ${counts['protected-or-partnership'] || 0}`);
