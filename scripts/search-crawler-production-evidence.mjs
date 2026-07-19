import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const defaultSiteUrl = 'https://eventme.live';
const execFileAsync = promisify(execFile);

export const SEARCH_CRAWLERS = Object.freeze([
  Object.freeze({
    name: 'Bingbot',
    user_agent: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'
  }),
  Object.freeze({
    name: 'OAI-SearchBot',
    user_agent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot'
  }),
  Object.freeze({
    name: 'PerplexityBot',
    user_agent: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)'
  })
]);

function argumentValue(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function parseRobotsGroups(robotsText = '') {
  const groups = [];
  let current = null;
  let hasRules = false;
  for (const rawLine of String(robotsText).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line || !line.includes(':')) continue;
    const separator = line.indexOf(':');
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === 'user-agent') {
      if (!current || hasRules) {
        current = { agents: [], rules: [] };
        groups.push(current);
        hasRules = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (current && ['allow', 'disallow'].includes(field)) {
      current.rules.push({ directive: field, path: value });
      hasRules = true;
    }
  }
  return groups;
}

export function robotsAllows(robotsText, crawlerName, pathname) {
  const crawler = String(crawlerName).toLowerCase();
  const groups = parseRobotsGroups(robotsText);
  const specific = groups.filter((group) => group.agents.some((agent) => agent !== '*' && crawler.includes(agent)));
  const selected = specific.length
    ? specific
    : groups.filter((group) => group.agents.includes('*'));
  const matches = selected
    .flatMap((group) => group.rules)
    .filter((rule) => rule.path && String(pathname).startsWith(rule.path))
    .sort((left, right) => right.path.length - left.path.length || (left.directive === 'allow' ? -1 : 1));
  return matches.length ? matches[0].directive === 'allow' : true;
}

export function detectsWafChallenge({ status, headers = {}, body = '' } = {}) {
  const normalizedHeaders = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value || '')]));
  if (normalizedHeaders['cf-mitigated']?.toLowerCase() === 'challenge') return true;
  if (normalizedHeaders['x-sucuri-block']) return true;
  if ([401, 403, 429, 503].includes(Number(status))) return true;
  return /cf-chl-|challenge-platform|captcha|just a moment|access denied|verify you are human/iu.test(String(body));
}

function detectsNoindex(html = '') {
  return [...String(html).matchAll(/<meta\b[^>]*>/giu)].some(([tag]) => (
    /name\s*=\s*["']robots["']/iu.test(tag)
    && /content\s*=\s*["'][^"']*noindex/iu.test(tag)
  ));
}

async function requestTextWithFetch(url, userAgent, fetchImpl, timeoutMs) {
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
        'user-agent': userAgent
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs)
    });
    const body = Buffer.from(await response.arrayBuffer()).toString('utf8');
    const headers = {
      'content-type': response.headers.get('content-type') || '',
      server: response.headers.get('server') || '',
      'x-cache': response.headers.get('x-cache') || '',
      'cf-mitigated': response.headers.get('cf-mitigated') || '',
      'x-sucuri-block': response.headers.get('x-sucuri-block') || ''
    };
    return {
      body,
      evidence: {
        http_status: response.status,
        final_url: response.url || url,
        content_type: headers['content-type'],
        server: headers.server,
        cache: headers['x-cache'],
        response_bytes: Buffer.byteLength(body),
        html_marker: /<html\b/iu.test(body),
        noindex_detected: detectsNoindex(body),
        waf_challenge_detected: detectsWafChallenge({ status: response.status, headers, body })
      }
    };
  } catch (error) {
    return {
      body: '',
      evidence: {
        http_status: null,
        final_url: url,
        content_type: '',
        server: '',
        cache: '',
        response_bytes: 0,
        html_marker: false,
        noindex_detected: false,
        waf_challenge_detected: false,
        error_type: ['AbortError', 'TimeoutError'].includes(error?.name) ? 'timeout' : 'network'
      }
    };
  }
}

async function requestTextWithCurl(url, userAgent, timeoutMs) {
  const marker = '__EVENTME_CURL_META__';
  try {
    const { stdout } = await execFileAsync('curl', [
      '--silent',
      '--show-error',
      '--location',
      '--max-time', String(Math.max(1, Math.ceil(timeoutMs / 1000))),
      '--user-agent', userAgent,
      '--header', 'Accept: text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
      '--write-out', `\n${marker}%{http_code}\t%{url_effective}\t%{content_type}\t%{size_download}`,
      url
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const markerIndex = stdout.lastIndexOf(marker);
    if (markerIndex < 0) throw new Error('curl metadata marker missing');
    const body = stdout.slice(0, Math.max(0, markerIndex - 1));
    const [status, finalUrl, contentType, responseBytes] = stdout.slice(markerIndex + marker.length).trim().split('\t');
    const httpStatus = Number(status);
    return {
      body,
      evidence: {
        http_status: Number.isInteger(httpStatus) ? httpStatus : null,
        final_url: finalUrl || url,
        content_type: contentType || '',
        server: '',
        cache: '',
        response_bytes: Number(responseBytes) || Buffer.byteLength(body),
        html_marker: /<html\b/iu.test(body),
        noindex_detected: detectsNoindex(body),
        waf_challenge_detected: detectsWafChallenge({ status: httpStatus, body })
      }
    };
  } catch (error) {
    return {
      body: '',
      evidence: {
        http_status: null,
        final_url: url,
        content_type: '',
        server: '',
        cache: '',
        response_bytes: 0,
        html_marker: false,
        noindex_detected: false,
        waf_challenge_detected: false,
        error_type: ['ETIMEDOUT', 'TIMEOUT'].includes(String(error?.code || '').toUpperCase()) ? 'timeout' : 'network'
      }
    };
  }
}

async function requestText(url, userAgent, fetchImpl, timeoutMs) {
  return fetchImpl
    ? requestTextWithFetch(url, userAgent, fetchImpl, timeoutMs)
    : requestTextWithCurl(url, userAgent, timeoutMs);
}

function eventUrlFromSitemap(sitemap = '', siteUrl = defaultSiteUrl) {
  const ownedPrefix = `${siteUrl.replace(/\/$/, '')}/events/`;
  const candidates = [];
  for (const match of String(sitemap).matchAll(/<loc>([^<]+)<\/loc>/giu)) {
    const url = match[1].replaceAll('&amp;', '&').trim();
    if (url.startsWith(ownedPrefix) && /\.html(?:$|[?#])/iu.test(url)) candidates.push(url);
  }
  return candidates.find((url) => !/\/events\/ended-/iu.test(url)) || candidates[0] || '';
}

export function crawlerEvidenceFailures(evidence = {}) {
  const failures = [];
  if (evidence.robots?.http_status !== 200) failures.push('robots_http_status');
  if (evidence.robots?.waf_challenge_detected) failures.push('robots_waf_challenge');
  if (!evidence.event_url) failures.push('event_url');
  for (const crawler of evidence.crawlers || []) {
    if (crawler.root.http_status !== 200) failures.push(`${crawler.name}_root_http_status`);
    if (crawler.event.http_status !== 200) failures.push(`${crawler.name}_event_http_status`);
    if (!crawler.root.html_marker || !crawler.event.html_marker) failures.push(`${crawler.name}_html_marker`);
    if (crawler.root.waf_challenge_detected || crawler.event.waf_challenge_detected) failures.push(`${crawler.name}_waf_challenge`);
    if (crawler.root.noindex_detected || crawler.event.noindex_detected) failures.push(`${crawler.name}_noindex`);
    if (!crawler.robots.root_allowed || !crawler.robots.event_allowed) failures.push(`${crawler.name}_robots`);
  }
  if (!evidence.indexnow_key?.dist_file_present) failures.push('indexnow_key_dist');
  if (!evidence.indexnow_key?.dist_content_matches_configured_key) failures.push('indexnow_key_dist_content');
  if (evidence.indexnow_key?.production_http_status !== 200) failures.push('indexnow_key_http_status');
  if (evidence.indexnow_key?.production_waf_challenge_detected) failures.push('indexnow_key_waf_challenge');
  if (!evidence.indexnow_key?.content_matches_configured_key) failures.push('indexnow_key_content');
  return [...new Set(failures)];
}

export async function collectCrawlerEvidence({
  siteUrl = defaultSiteUrl,
  eventUrl = '',
  keyPath = path.join(root, 'data', 'indexnow-key.txt'),
  distDir = path.join(root, 'dist'),
  fetchImpl,
  now = () => new Date().toISOString(),
  timeoutMs = 20_000
} = {}) {
  const normalizedSiteUrl = String(siteUrl).replace(/\/$/, '');
  const evidenceAgent = 'EventLive-T3.1-Evidence/1.0 (+https://eventme.live/)';
  const robotsRequest = await requestText(`${normalizedSiteUrl}/robots.txt`, evidenceAgent, fetchImpl, timeoutMs);
  let selectedEventUrl = eventUrl;
  let sitemapStatus = null;
  if (!selectedEventUrl) {
    const sitemapRequest = await requestText(`${normalizedSiteUrl}/sitemap.xml`, evidenceAgent, fetchImpl, timeoutMs);
    sitemapStatus = sitemapRequest.evidence.http_status;
    selectedEventUrl = eventUrlFromSitemap(sitemapRequest.body, normalizedSiteUrl);
  }
  if (selectedEventUrl && !selectedEventUrl.startsWith(`${normalizedSiteUrl}/events/`)) {
    throw new Error('Evidence event URL must be an owned /events/ page.');
  }
  const eventPath = selectedEventUrl ? new URL(selectedEventUrl).pathname : '';

  const crawlers = await Promise.all(SEARCH_CRAWLERS.map(async (crawler) => {
    const [rootRequest, eventRequest] = await Promise.all([
      requestText(`${normalizedSiteUrl}/`, crawler.user_agent, fetchImpl, timeoutMs),
      selectedEventUrl
        ? requestText(selectedEventUrl, crawler.user_agent, fetchImpl, timeoutMs)
        : Promise.resolve({ evidence: { http_status: null, waf_challenge_detected: false, noindex_detected: false } })
    ]);
    return {
      name: crawler.name,
      user_agent_token: crawler.name,
      root: rootRequest.evidence,
      event: eventRequest.evidence,
      robots: {
        root_allowed: robotsAllows(robotsRequest.body, crawler.name, '/'),
        event_allowed: eventPath ? robotsAllows(robotsRequest.body, crawler.name, eventPath) : false
      }
    };
  }));

  const configuredKey = fs.readFileSync(keyPath, 'utf8').trim();
  if (!/^[A-Za-z0-9-]{8,128}$/.test(configuredKey)) throw new Error('Configured IndexNow key has an invalid format.');
  const distKeyPath = path.join(distDir, `${configuredKey}.txt`);
  const distFilePresent = fs.existsSync(distKeyPath);
  const distContentMatches = distFilePresent && fs.readFileSync(distKeyPath, 'utf8').trim() === configuredKey;
  const keyRequest = await requestText(`${normalizedSiteUrl}/${configuredKey}.txt`, evidenceAgent, fetchImpl, timeoutMs);

  const evidence = {
    schema: 'eventlive.search-crawler-production-evidence.v1',
    generated_at: now(),
    transport: fetchImpl ? 'fetch-fixture' : 'curl',
    site: `${normalizedSiteUrl}/`,
    event_url: selectedEventUrl,
    sitemap_http_status: sitemapStatus,
    robots: {
      http_status: robotsRequest.evidence.http_status,
      content_type: robotsRequest.evidence.content_type,
      waf_challenge_detected: robotsRequest.evidence.waf_challenge_detected
    },
    crawlers,
    indexnow_key: {
      public_path: '/<indexnow-key>.txt',
      dist_file_present: distFilePresent,
      dist_content_matches_configured_key: distContentMatches,
      production_http_status: keyRequest.evidence.http_status,
      production_content_type: keyRequest.evidence.content_type,
      production_response_bytes: keyRequest.evidence.response_bytes,
      production_waf_challenge_detected: keyRequest.evidence.waf_challenge_detected,
      content_matches_configured_key: keyRequest.body.trim() === configuredKey
    }
  };
  const failures = crawlerEvidenceFailures(evidence);
  evidence.acceptance = { status: failures.length ? 'FAIL' : 'PASS', failures };
  return evidence;
}

export function writeCrawlerEvidence(evidence, {
  jsonPath = path.join(root, 'reports', 'search-crawler-production-evidence.json'),
  markdownPath = path.join(root, 'reports', 'search-crawler-production-evidence.md')
} = {}) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  const lines = [
    '# EventLive Search Crawler Production Evidence',
    '',
    `- generated_at: ${evidence.generated_at}`,
    `- status: ${evidence.acceptance.status}`,
    `- site: ${evidence.site}`,
    `- event: ${evidence.event_url || '(missing)'}`,
    `- robots_http_status: ${evidence.robots.http_status ?? 'network-error'}`,
    '',
    '| Crawler | Root HTTP | Event HTTP | Robots root/event | WAF challenge | noindex |',
    '|---|---:|---:|---|---|---|',
    ...evidence.crawlers.map((crawler) => `| ${crawler.name} | ${crawler.root.http_status ?? '-'} | ${crawler.event.http_status ?? '-'} | ${crawler.robots.root_allowed ? 'allow' : 'block'}/${crawler.robots.event_allowed ? 'allow' : 'block'} | ${crawler.root.waf_challenge_detected || crawler.event.waf_challenge_detected ? 'yes' : 'no'} | ${crawler.root.noindex_detected || crawler.event.noindex_detected ? 'yes' : 'no'} |`),
    '',
    '## IndexNow key',
    '',
    `- dist_file_present: ${evidence.indexnow_key.dist_file_present}`,
    `- dist_content_matches_configured_key: ${evidence.indexnow_key.dist_content_matches_configured_key}`,
    `- production_http_status: ${evidence.indexnow_key.production_http_status ?? 'network-error'}`,
    `- production_content_matches_configured_key: ${evidence.indexnow_key.content_matches_configured_key}`,
    '',
    `Failures: ${evidence.acceptance.failures.length ? evidence.acceptance.failures.join(', ') : 'none'}`
  ];
  fs.writeFileSync(markdownPath, `${lines.join('\n')}\n`, 'utf8');
}

export async function main(args = process.argv.slice(2)) {
  const evidence = await collectCrawlerEvidence({
    siteUrl: argumentValue(args, '--site', process.env.EVENTLIVE_SITE_URL || defaultSiteUrl),
    eventUrl: argumentValue(args, '--event', ''),
    keyPath: argumentValue(args, '--key', path.join(root, 'data', 'indexnow-key.txt')),
    distDir: argumentValue(args, '--dist', path.join(root, 'dist'))
  });
  writeCrawlerEvidence(evidence, {
    jsonPath: argumentValue(args, '--json-report', path.join(root, 'reports', 'search-crawler-production-evidence.json')),
    markdownPath: argumentValue(args, '--md-report', path.join(root, 'reports', 'search-crawler-production-evidence.md'))
  });
  console.log(`SEARCH_CRAWLER_EVIDENCE_${evidence.acceptance.status} crawlers=${evidence.crawlers.length} root_200=${evidence.crawlers.filter((crawler) => crawler.root.http_status === 200).length} event_200=${evidence.crawlers.filter((crawler) => crawler.event.http_status === 200).length} robots_allowed=${evidence.crawlers.filter((crawler) => crawler.robots.root_allowed && crawler.robots.event_allowed).length} indexnow_key_http=${evidence.indexnow_key.production_http_status ?? 'network-error'}`);
  if (evidence.acceptance.status !== 'PASS') throw new Error(`Crawler evidence failed: ${evidence.acceptance.failures.join(', ')}`);
  return evidence;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`SEARCH_CRAWLER_EVIDENCE_FAILED ${error.message}`);
    process.exitCode = 1;
  });
}
