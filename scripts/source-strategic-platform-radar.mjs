import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './program-lifecycle-utils.mjs';

const generatedAt = new Date().toISOString();
const reportsDir = path.join(root, 'reports');
const jsonPath = path.join(reportsDir, 'source-strategic-platform-radar.json');
const mdPath = path.join(reportsDir, 'source-strategic-platform-radar.md');
const timeoutMs = Math.max(5000, Number(process.env.EVENTLIVE_STRATEGIC_PLATFORM_RADAR_TIMEOUT_MS || 25000));
const maxBodyBytes = Math.max(100000, Number(process.env.EVENTLIVE_STRATEGIC_PLATFORM_RADAR_MAX_BODY_BYTES || 500000));
const userAgent = 'EventLiveSourceRadar/1.0 (+https://eventme.live/; source evidence refresh)';

const platforms = [
  {
    id: 'scega-exhibitions-conferences',
    name: 'SCEGA ePortal',
    role_lens: 'Regulatory-market analyst for exhibitions and conferences',
    url: 'https://eportal.scega.gov.sa/home',
    decision: 'official-monitor',
    project_use: 'Track as a high-value official source for exhibitions and conferences; do not auto-publish until event-detail extraction is verified.',
    inspect_assets: true,
    asset_patterns: [/main-/i, /chunk-/i],
    max_assets: 6
  },
  {
    id: 'nec-saudi-events',
    name: 'National Events Center',
    role_lens: 'Partnership and national-calendar access lead',
    url: 'https://nec.gov.sa/ar',
    decision: 'partnership-api',
    project_use: 'Keep as the top strategic feed target; public site is evidence, while national-calendar export/API access is the real integration ask.',
    inspect_assets: false
  },
  {
    id: 'visit-saudi-calendar',
    name: 'Visit Saudi Calendar',
    role_lens: 'Production source operator',
    url: 'https://www.visitsaudi.com/ar/saudi-calendar',
    api_urls: [
      'https://www.visitsaudi.com/bin/api/v3/events?locale=ar',
      'https://www.visitsaudi.com/bin/api/v3/events?locale=en'
    ],
    decision: 'active-collector',
    project_use: 'Keep in the 6-hour source ring; Arabic and English API payloads are reachable and useful for tourism-facing event discovery.',
    inspect_assets: false
  },
  {
    id: 'webook-explore',
    name: 'webook Explore',
    role_lens: 'Ticketing-marketplace intelligence analyst',
    url: 'https://webook.com/ar/explore',
    decision: 'candidate-discovery',
    project_use: 'Use for lead discovery, ticket-link corroboration, and duplicate checks; require official organizer or authority confirmation before promotion.',
    inspect_assets: true,
    asset_patterns: [/@wbk\/api/i, /@wbk\/ticketing/i, /@wbk\/config/i],
    max_assets: 4
  },
  {
    id: 'enjoy-saudi-events',
    name: 'Enjoy Saudi',
    role_lens: 'Entertainment public-interface reviewer',
    url: 'https://enjoy.sa/ar/',
    decision: 'official-evidence-protected',
    project_use: 'Treat as official GEA-facing evidence and partnership target; terminal fetch may be protected, so scheduled failures are not catalog failures.',
    inspect_assets: false
  },
  {
    id: 'gea-entertainment-events',
    name: 'General Entertainment Authority Events',
    role_lens: 'Authority-of-record verifier',
    url: 'https://gea.gov.sa/events/',
    decision: 'official-evidence-protected',
    project_use: 'Use as authority confirmation for entertainment windows and venue pages; keep separate from Enjoy and ticketing marketplaces.',
    inspect_assets: false
  },
  {
    id: 'evento-sa-events',
    name: 'Evento',
    role_lens: 'Commercial app/API surface auditor',
    url: 'https://www.evento.sa/home',
    decision: 'candidate-discovery',
    project_use: 'Use only as commercial marketplace intelligence until documented API permission exists; exposed app API hints are evidence, not a scraping license.',
    inspect_assets: true,
    asset_patterns: [/main/i],
    max_assets: 2
  },
  {
    id: 'ministry-commerce-events',
    name: 'Ministry of Commerce Upcoming Events',
    role_lens: 'Government freshness and yield auditor',
    url: 'https://mc.gov.sa/ar/mediacenter/Events/UpcomingEvents/pages/default.aspx',
    decision: 'low-yield-official-monitor',
    project_use: 'Monitor as official evidence with low priority; page structure is SharePoint-style and may be stale or empty for upcoming events.',
    inspect_assets: false
  }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeWhitespace(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function truncate(value = '', max = 400) {
  const text = normalizeWhitespace(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function absolutize(url, base) {
  try {
    return new URL(url, base).href;
  } catch {
    return '';
  }
}

async function fetchWithFallback(url, accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8') {
  const headers = {
    'user-agent': userAgent,
    accept,
    'accept-language': 'ar,en;q=0.8'
  };

  try {
    const response = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs)
    });
    const text = await response.text();
    return {
      ok: true,
      via: 'fetch',
      status: response.status,
      final_url: response.url,
      content_type: response.headers.get('content-type') || '',
      body: text.slice(0, maxBodyBytes),
      bytes: text.length,
      error: ''
    };
  } catch (error) {
    const curl = spawnSync('curl', [
      '-L',
      '--max-time',
      String(Math.ceil(timeoutMs / 1000)),
      '-A',
      userAgent,
      '-H',
      `Accept: ${accept}`,
      '-w',
      '\n__EVENTLIVE_HTTP_STATUS__:%{http_code}\n__EVENTLIVE_EFFECTIVE_URL__:%{url_effective}\n__EVENTLIVE_CONTENT_TYPE__:%{content_type}\n',
      url
    ], {
      encoding: 'utf8',
      timeout: timeoutMs + 5000,
      maxBuffer: maxBodyBytes + 20000
    });
    const output = String(curl.stdout || '');
    const status = Number(output.match(/__EVENTLIVE_HTTP_STATUS__:(\d+)/)?.[1] || 0);
    const finalUrl = output.match(/__EVENTLIVE_EFFECTIVE_URL__:(.*?)\n/)?.[1]?.trim() || url;
    const contentType = output.match(/__EVENTLIVE_CONTENT_TYPE__:(.*?)\n/)?.[1]?.trim() || '';
    const body = output.replace(/\n__EVENTLIVE_HTTP_STATUS__:[\s\S]*$/, '');

    return {
      ok: status > 0,
      via: 'curl',
      status,
      final_url: finalUrl,
      content_type: contentType,
      body: body.slice(0, maxBodyBytes),
      bytes: body.length,
      error: curl.error?.message || String(error.message || error)
    };
  }
}

function titleFromHtml(html = '') {
  return normalizeWhitespace(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
}

function linksFromHtml(html = '', baseUrl = '') {
  return [...html.matchAll(/<(?:a|script|link)[^>]+(?:href|src)=["']([^"']+)["']/gi)]
    .map((match) => absolutize(match[1], baseUrl))
    .filter(Boolean);
}

function extractHints(text = '', baseUrl = '') {
  const absolute = [...text.matchAll(/https?:\/\/[^"'`\s<>)]+/gi)].map((match) => match[0]);
  const relative = [...text.matchAll(/["'`](\/[^"'`\s<>)]+?(?:api|events?|calendar|event-detail|event-details|h-events|فعاليات)[^"'`\s<>)]*)["'`]/gi)]
    .map((match) => absolutize(match[1], baseUrl));
  const words = [...text.matchAll(/\b(?:events?|calendar|ticket|booking|exhibition|conference|api|فعاليات|فعالية|معارض|مؤتمرات)\b/gi)]
    .map((match) => match[0]);

  return {
    urls: [...new Set([...absolute, ...relative])].slice(0, 40),
    words: [...new Set(words)].slice(0, 30)
  };
}

function classify(result) {
  const body = result.body || '';
  if (!result.ok || result.status === 0) return 'fetch-error';
  if ([401, 403, 429, 503].includes(result.status)) {
    if (/cloudflare|access unavailable|just a moment|cf-ray|challenge/i.test(body)) return 'protected';
    return 'restricted';
  }
  if (result.status >= 400) return 'http-error';
  if (/just a moment|access unavailable|cf-chl|challenge-platform|_queued\s*:\s*true|rs-queue/i.test(body)) return 'protected';
  return 'reachable';
}

async function inspectAssets(platform, pageResult) {
  if (!platform.inspect_assets || !pageResult.body) return [];

  const assets = linksFromHtml(pageResult.body, pageResult.final_url)
    .filter((asset) => /\.js(?:\?|$)/i.test(asset))
    .filter((asset) => !platform.asset_patterns?.length || platform.asset_patterns.some((pattern) => pattern.test(asset)))
    .sort((a, b) => {
      const score = (asset) => (/\/main[.-]/i.test(asset) ? 0 : /@wbk\/api/i.test(asset) ? 1 : /@wbk\/ticketing/i.test(asset) ? 2 : 5);
      return score(a) - score(b);
    })
    .slice(0, platform.max_assets || 3);

  const inspected = [];
  for (const asset of assets) {
    const result = await fetchWithFallback(asset, 'application/javascript,*/*');
    const hints = extractHints(result.body, asset);
    inspected.push({
      url: asset,
      status: result.status,
      bytes: result.bytes,
      classification: classify(result),
      hint_urls: hints.urls.slice(0, 25),
      hint_words: hints.words.slice(0, 25)
    });
  }
  return inspected;
}

function apiSummary(text = '') {
  try {
    const parsed = JSON.parse(text);
    const data = parsed?.response?.data || parsed?.data || [];
    const items = Array.isArray(data) ? data : [];
    return {
      parse_ok: true,
      item_count: items.length,
      sample_titles: items.slice(0, 5).map((item) => item?.title).filter(Boolean)
    };
  } catch {
    return {
      parse_ok: false,
      item_count: 0,
      sample_titles: []
    };
  }
}

async function inspectPlatform(platform) {
  const page = await fetchWithFallback(platform.url);
  const pageHints = extractHints(page.body, page.final_url || platform.url);
  const assets = await inspectAssets(platform, page);
  const api_results = [];

  for (const apiUrl of platform.api_urls || []) {
    const api = await fetchWithFallback(apiUrl, 'application/json,*/*');
    api_results.push({
      url: apiUrl,
      status: api.status,
      bytes: api.bytes,
      classification: classify(api),
      summary: apiSummary(api.body),
      sample: truncate(api.body, 250)
    });
  }

  return {
    id: platform.id,
    name: platform.name,
    role_lens: platform.role_lens,
    url: platform.url,
    decision: platform.decision,
    project_use: platform.project_use,
    status: page.status,
    final_url: page.final_url,
    via: page.via,
    content_type: page.content_type,
    bytes: page.bytes,
    title: titleFromHtml(page.body),
    classification: classify(page),
    error: page.error,
    page_hint_urls: pageHints.urls,
    page_hint_words: pageHints.words,
    asset_results: assets,
    api_results,
    text_sample: truncate(page.body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '), 500)
  };
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\n/g, ' ').replace(/\|/g, '\\|')).join(' | ')} |`)
  ].join('\n');
}

function renderMarkdown(report) {
  const rows = report.platforms.map((platform) => [
    platform.name,
    platform.role_lens,
    platform.classification,
    platform.status,
    platform.decision,
    platform.title || '-'
  ]);

  const details = report.platforms.flatMap((platform) => {
    const apiLines = platform.api_results.map((api) => `  - API ${api.status} ${api.url}: ${api.summary.item_count} items; ${api.summary.sample_titles.join(', ') || 'no titles'}`);
    const assetLines = platform.asset_results.map((asset) => `  - Asset ${asset.status} ${asset.url.split('/').pop()}: ${asset.hint_urls.slice(0, 6).join(', ') || 'no URL hints'}`);
    return [
      `### ${platform.name}`,
      '',
      `- Role lens: ${platform.role_lens}`,
      `- Decision: ${platform.decision}`,
      `- Classification: ${platform.classification} (${platform.status}, ${platform.via})`,
      `- Project use: ${platform.project_use}`,
      `- Title: ${platform.title || '-'}`,
      `- Hint URLs: ${platform.page_hint_urls.slice(0, 8).join(', ') || '-'}`,
      ...apiLines,
      ...assetLines,
      ''
    ];
  });

  return [
    '# Strategic Platform Source Radar',
    '',
    `Generated at: ${report.generated_at}`,
    '',
    'Policy: evidence refresh, API-surface mapping, and source strategy only. This radar does not auto-publish catalog events.',
    '',
    '## Summary',
    '',
    table(['Platform', 'Role', 'Reachability', 'HTTP', 'Decision', 'Title'], rows),
    '',
    '## Platform Details',
    '',
    ...details
  ].join('\n');
}

ensureDir(reportsDir);

const results = [];
for (const platform of platforms) {
  results.push(await inspectPlatform(platform));
}

const report = {
  schema: 'eventlive.source-strategic-platform-radar.v1',
  generated_at: generatedAt,
  policy: {
    allowed_use: 'official source evidence refresh, API-surface mapping, partnership prioritization, extractor backlog decisions',
    disallowed_use: 'direct catalog publication without official confirmation and duplicate review'
  },
  totals: {
    platforms: results.length,
    reachable: results.filter((platform) => platform.classification === 'reachable').length,
    protected: results.filter((platform) => platform.classification === 'protected').length,
    active_collectors: results.filter((platform) => platform.decision === 'active-collector').length
  },
  platforms: results
};

fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(mdPath, renderMarkdown(report), 'utf8');

console.log('# Strategic Platform Source Radar');
console.log(`- Platforms: ${report.totals.platforms}`);
console.log(`- Reachable: ${report.totals.reachable}`);
console.log(`- Protected: ${report.totals.protected}`);
console.log(`- Report: ${path.relative(root, mdPath)}`);
