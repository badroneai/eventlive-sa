import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const registryPath = path.join(root, 'data', 'source_registry.json');
const collectionReportPath = path.join(root, 'reports', 'source-collection-report.json');
const outputDir = path.join(root, 'data', 'raw', 'browser-probes');
const reportJsonPath = path.join(root, 'reports', 'source-browser-probe-report.json');
const reportMdPath = path.join(root, 'reports', 'source-browser-probe-report.md');
const checkpointJsonPath = path.join(root, 'reports', 'source-browser-probe-checkpoint.json');
const generatedAt = new Date().toISOString();
const stamp = generatedAt.replace(/[:.]/g, '-');
const selectedIds = (process.env.EVENTLIVE_BROWSER_SOURCE_IDS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const probeScope = String(process.env.EVENTLIVE_BROWSER_SCOPE || 'priority').toLowerCase();
const probeLimit = Math.max(1, Number(process.env.EVENTLIVE_BROWSER_PROBE_LIMIT || 8));
const waitMs = Math.max(1000, Number(process.env.EVENTLIVE_BROWSER_WAIT_MS || 4500));
const timeoutMs = Math.max(10000, Number(process.env.EVENTLIVE_BROWSER_TIMEOUT_MS || 60000));
const resultMaxAgeMs = Math.max(60_000, Number(process.env.EVENTLIVE_BROWSER_RESULT_MAX_AGE_MS || 12 * 60 * 60 * 1000));
const maxBodyPreview = Math.max(240, Number(process.env.EVENTLIVE_BROWSER_BODY_PREVIEW || 1800));
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function normalizeWhitespace(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function safeSlug(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'source';
}

function sourceUrl(source) {
  return source.collector_url || source.url;
}

function isPolicyProtected(source) {
  return source.fetch_method === 'partnership-api'
    || source.intake_policy === 'partnership-needed'
    || source.boundary === 'partnership_or_api_only';
}

function readCollectionProblems() {
  if (!exists(collectionReportPath)) return new Map();
  const report = readJson(collectionReportPath);
  return new Map((report.sources || [])
    .filter((source) => source.status === 'error' || Number(source.extracted || 0) === 0)
    .map((source) => [source.id, source]));
}

function rankProbeSources(sources, collectionProblems, limit = probeLimit) {
  const rank = (source) => {
    const problem = collectionProblems.get(source.id);
    if (problem?.status === 'error') return 0;
    if (problem && Number(problem.extracted || 0) === 0) return 1;
    if (source.ring === 'extractor-backlog') return 2;
    return 9;
  };
  return [...sources]
    .filter((source) => rank(source) < 9)
    .filter((source) => !isPolicyProtected(source))
    .sort((a, b) => rank(a) - rank(b) || Number(a.priority || 999) - Number(b.priority || 999))
    .slice(0, limit);
}

function mergeRecentProbeResults(previousReport, currentResults, currentTime = Date.now()) {
  const previousAt = new Date(previousReport?.generated_at || 0).getTime();
  const recentPrevious = Number.isFinite(previousAt) && currentTime - previousAt <= resultMaxAgeMs
    ? (previousReport.sources || [])
    : [];
  const merged = new Map(recentPrevious.map((source) => [source.id, source]));
  for (const source of currentResults) merged.set(source.id, source);
  return [...merged.values()].sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
}

function chooseProbeSources(registry) {
  const collectionProblems = readCollectionProblems();
  const sources = [...(registry.sources || [])].sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));
  if (selectedIds.length) {
    return sources.filter((source) => selectedIds.includes(source.id));
  }
  if (probeScope === 'all') {
    return sources
      .filter((source) => !isPolicyProtected(source))
      .slice(0, probeLimit);
  }
  return rankProbeSources(sources, collectionProblems, probeLimit);
}

function isLikelyApiUrl(url = '') {
  return /\/api\/|\/internal\/|graphql|ajax|\.json(?:$|\?)|content\/events|OtherEvents|CulturalCalendar|products?Availability|productPrice|events\/list|courses?\/list|programs?\/list|bootcamps?\/list/i.test(url);
}

function isNoisyUrl(url = '') {
  return /google-analytics|googletagmanager|doubleclick|facebook|snapchat|tiktok|linkedin|hotjar|mixpanel|cookieyes|clarity|adservice|analytics|pixel|collect|unpkg\.com|cdnjs\.cloudflare\.com|ChatBot|PageRating|consent\/cookies|LastModifyDate|newslettermodal|formOptions|getExchangeRate|fetchTripAdvisorData|mpc2-prod/i.test(url);
}

function isStaticResource(url = '', contentType = '', resourceType = '') {
  return resourceType === 'stylesheet'
    || resourceType === 'font'
    || resourceType === 'image'
    || resourceType === 'media'
    || /\.(?:css|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|map)(?:$|\?)/i.test(url)
    || /^image\//i.test(contentType)
    || /^font\//i.test(contentType);
}

function shouldCaptureNetwork(url = '', contentType = '', resourceType = '') {
  if (isNoisyUrl(url) || isStaticResource(url, contentType, resourceType)) return false;
  if (resourceType === 'document' && /html/i.test(contentType)) return false;
  if (resourceType === 'script' && /javascript/i.test(contentType) && !/\/api\/|\/internal\/|\.json/i.test(url)) return false;
  if (/json|graphql|javascript/i.test(contentType) && isLikelyApiUrl(url)) return true;
  if (resourceType === 'xhr' || resourceType === 'fetch') return isLikelyApiUrl(url) || /json|graphql/i.test(contentType);
  return isLikelyApiUrl(url) && /json|text|javascript|html/i.test(contentType || 'text/html');
}

function responseShape(text = '', contentType = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 'empty';
  if (/json/i.test(contentType) || /^[{\[]/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return `json-array:${parsed.length}`;
      if (parsed && typeof parsed === 'object') return `json-object:${Object.keys(parsed).slice(0, 8).join(',')}`;
    } catch {
      return 'json-like-invalid';
    }
  }
  if (/<!doctype|<html/i.test(trimmed)) return 'html';
  return 'text';
}

function extractEndpointCandidates(network = []) {
  const seen = new Set();
  return network
    .filter((entry) => entry.status >= 200 && entry.status < 400)
    .filter((entry) => (
      /json|graphql/i.test(entry.content_type || '')
      || String(entry.response_shape || '').startsWith('json-')
      || /\/api\/|\/internal\/|\.json(?:$|\?)/i.test(entry.url)
    ))
    .filter((entry) => !isNoisyUrl(entry.url))
    .filter((entry) => !isStaticResource(entry.url, entry.content_type, entry.resource_type))
    .filter((entry) => {
      const haystack = `${entry.url} ${entry.request_post_data || ''} ${entry.preview || ''}`;
      if (/graphql/i.test(entry.url)) return /event|calendar|program|course|bootcamp|فعالية|تقويم/i.test(haystack);
      return /event|events|calendar|program|course|bootcamp|experiencePath|availability|content\/events|OtherEvents|CulturalCalendar|internal\/content/i.test(haystack);
    })
    .filter((entry) => {
      const key = `${entry.method}|${entry.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 30);
}

function analyzeHtmlSignals(html = '', pageText = '', links = []) {
  const text = normalizeWhitespace(pageText || html.replace(/<[^>]+>/g, ' '));
  return {
    has_next_data: /id=["']__NEXT_DATA__["']/i.test(html),
    has_nuxt: /__NUXT__|_nuxt\//i.test(html),
    has_json_ld: /application\/ld\+json/i.test(html),
    has_event_schema: /"@type"\s*:\s*"[^"]*Event|"startDate"\s*:/i.test(html),
    date_snippets: [...text.matchAll(/.{0,40}(?:20\d{2}[-/]\d{2}[-/]\d{2}|\d{1,2}\s*(?:-|–|—|to)\s*\d{1,2}\s+[A-Za-z\u0600-\u06ff]{3,12}|\d{1,2}\s+[A-Za-z\u0600-\u06ff]{3,12}\s+20\d{2}|يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر).{0,80}/gi)]
      .slice(0, 8)
      .map((match) => normalizeWhitespace(match[0])),
    event_like_links: links
      .filter((link) => /event|events|calendar|whats-on|program|course|bootcamp|workshop|فعالية|برنامج|تقويم|دورة|معسكر/i.test(`${link.href} ${link.text}`))
      .slice(0, 20)
  };
}

function hasProtectionQueueSignal(value = '') {
  return /queue-it|queueit|protectsaudi|general queue page|waiting room|queue\.platinumlist\.net/i.test(String(value || ''));
}

function classifyProbe({ status = 0, html = '', pageText = '', links = [], network = [], policy_skipped = false }) {
  if (policy_skipped) return 'policy-skipped-partnership';
  const body = `${html}\n${pageText}`.slice(0, 12000);
  if (status === 403 || hasProtectionQueueSignal(body) || /just a moment|cf-browser-verification|cdn-cgi\/challenge|request rejected|access denied/i.test(body)) {
    return 'blocked-or-protected';
  }
  const endpoints = extractEndpointCandidates(network);
  if (endpoints.length) return 'browser-network-api';
  const signals = analyzeHtmlSignals(html, pageText, links);
  if (signals.has_next_data || signals.has_nuxt) return 'browser-hydration-payload';
  if (signals.has_json_ld || signals.has_event_schema) return 'browser-structured-html';
  if (signals.event_like_links.length || signals.date_snippets.length >= 2) return 'rendered-html-candidates';
  if (!normalizeWhitespace(pageText).length || normalizeWhitespace(pageText).length < 120) return 'empty-or-shell';
  return 'rendered-text-review';
}

function nextActionFor(classification) {
  const actions = {
    'browser-network-api': 'ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار.',
    'browser-hydration-payload': 'استخرج __NEXT_DATA__/__NUXT__ أو state payload قبل الاعتماد على HTML.',
    'browser-structured-html': 'اكتب extractor من JSON-LD أو structured scripts مع fallback للبطاقات.',
    'rendered-html-candidates': 'اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي.',
    'rendered-text-review': 'راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط.',
    'empty-or-shell': 'اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector.',
    'blocked-or-protected': 'لا تلتف على الحماية؛ صنف المصدر partnership/API أو ابحث عن مسار رسمي.',
    'policy-skipped-partnership': 'هذا مصدر شراكة/API؛ لا يفتح ضمن الجلب الآلي العام.'
  };
  return actions[classification] || 'راجع التصنيف.';
}

function markdownCell(value = '') {
  return normalizeWhitespace(value)
    .replace(/\|/g, '/')
    .replace(/\n/g, ' ')
    .trim();
}

function truncateForReport(value = '', max = 150) {
  const text = markdownCell(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function sampleDateSnippets(source = {}, limit = 3) {
  return (source.signals?.date_snippets || [])
    .filter(Boolean)
    .slice(0, limit)
    .map((snippet) => truncateForReport(snippet, 140));
}

function sampleEventLinks(source = {}, limit = 4) {
  return (source.signals?.event_like_links || [])
    .filter((link) => link?.href && !String(link.href).endsWith('#'))
    .slice(0, limit)
    .map((link) => {
      const label = truncateForReport(link.text || link.href, 70);
      return `${label} -> ${truncateForReport(link.href, 120)}`;
    });
}

function sampleEndpointPreviews(source = {}, limit = 2) {
  return (source.network_endpoints || [])
    .slice(0, limit)
    .map((endpoint) => {
      const preview = truncateForReport(endpoint.preview || endpoint.response_shape || '', 120);
      return `${endpoint.method} ${truncateForReport(endpoint.url, 110)} (${endpoint.status}, ${endpoint.response_shape})${preview ? `: ${preview}` : ''}`;
    });
}

function joinedSamples(samples = []) {
  return samples.length ? samples.map((item) => markdownCell(item)).join('<br>') : '-';
}

async function importPlaywright() {
  try {
    return await import('playwright');
  } catch (error) {
    throw new Error(`Playwright is required for browser probes. Run npm install first. (${error.message})`);
  }
}

async function probeSource(browser, source) {
  if (isPolicyProtected(source)) {
    const classification = classifyProbe({ policy_skipped: true });
    return {
      id: source.id,
      name: source.name,
      priority: source.priority,
      url: sourceUrl(source),
      status: 'skipped',
      classification,
      next_action: nextActionFor(classification),
      network_endpoints: []
    };
  }

  const page = await browser.newPage({
    userAgent,
    extraHTTPHeaders: {
      'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  const network = [];
  const requests = new Map();
  const started = Date.now();

  page.on('request', (request) => {
    requests.set(request.url(), {
      method: request.method(),
      resource_type: request.resourceType(),
      post_data: normalizeWhitespace(request.postData() || '').slice(0, 1200)
    });
  });

  page.on('response', async (response) => {
    const request = response.request();
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    const requestMeta = requests.get(url) || {
      method: request.method(),
      resource_type: request.resourceType(),
      post_data: normalizeWhitespace(request.postData() || '').slice(0, 1200)
    };
    if (!shouldCaptureNetwork(url, contentType, requestMeta.resource_type)) return;
    let preview = '';
    if (/json|text|javascript|html|graphql/i.test(contentType)) {
      try {
        preview = (await response.text()).slice(0, maxBodyPreview);
      } catch {
        preview = '';
      }
    }
    network.push({
      method: requestMeta.method,
      status: response.status(),
      url,
      content_type: contentType.split(';')[0],
      resource_type: requestMeta.resource_type,
      request_post_data: requestMeta.post_data,
      response_shape: responseShape(preview, contentType),
      preview: normalizeWhitespace(preview).slice(0, maxBodyPreview)
    });
  });

  let responseStatus = 0;
  let navigationError = '';
  try {
    const response = await page.goto(sourceUrl(source), { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    responseStatus = response?.status() || 0;
    await page.waitForLoadState('networkidle', { timeout: Math.min(12000, Math.max(2500, waitMs + 2500)) }).catch(() => {});
    await page.waitForTimeout(waitMs);
  } catch (error) {
    navigationError = error.message;
  }

  const html = await page.content().catch(() => '');
  const pageData = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href]')].map((link) => ({
      text: (link.innerText || link.getAttribute('aria-label') || '').trim().slice(0, 120),
      href: link.href
    }));
    const scripts = [...document.scripts].map((script) => ({
      id: script.id || '',
      type: script.type || '',
      src: script.src || '',
      bytes: (script.textContent || '').length
    }));
    return {
      title: document.title || '',
      text: document.body?.innerText || '',
      links,
      scripts
    };
  }).catch(() => ({ title: '', text: '', links: [], scripts: [] }));

  const baseName = `${safeSlug(source.id)}-${stamp}`;
  const htmlPath = path.join(outputDir, `${baseName}.html`);
  const screenshotPath = path.join(outputDir, `${baseName}.png`);
  fs.writeFileSync(htmlPath, html, 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  await page.close().catch(() => {});

  const htmlSignals = analyzeHtmlSignals(html, pageData.text, pageData.links);
  const networkEndpoints = extractEndpointCandidates(network);
  const finalUrl = page.url();
  const classification = classifyProbe({
    status: responseStatus,
    html,
    pageText: pageData.text,
    links: pageData.links,
    network
  });

  return {
    id: source.id,
    name: source.name,
    priority: source.priority,
    url: sourceUrl(source),
    final_url: finalUrl || sourceUrl(source),
    status: navigationError ? 'error' : 'ok',
    http_status: responseStatus,
    navigation_error: navigationError,
    duration_ms: Date.now() - started,
    classification,
    next_action: nextActionFor(classification),
    title: pageData.title,
    text_bytes: Buffer.byteLength(pageData.text || '', 'utf8'),
    html_bytes: Buffer.byteLength(html || '', 'utf8'),
    html_snapshot: rel(htmlPath),
    screenshot: exists(screenshotPath) ? rel(screenshotPath) : '',
    signals: htmlSignals,
    script_signals: {
      next_data_scripts: pageData.scripts.filter((script) => script.id === '__NEXT_DATA__').length,
      nuxt_scripts: pageData.scripts.filter((script) => /_nuxt|__NUXT__/i.test(`${script.src} ${script.id}`)).length,
      json_ld_scripts: pageData.scripts.filter((script) => /ld\+json/i.test(script.type)).length,
      large_inline_scripts: pageData.scripts.filter((script) => !script.src && script.bytes > 5000).length
    },
    network_total: network.length,
    network_endpoints: networkEndpoints,
    network_sample: network.slice(0, 25)
  };
}

function renderMarkdown(report) {
  const rows = report.sources.map((source) => `| ${source.priority ?? '-'} | ${source.id} | ${source.status} | ${source.http_status ?? '-'} | ${source.classification} | ${source.network_endpoints.length} | ${source.signals?.event_like_links?.length ?? 0} | ${source.signals?.date_snippets?.length ?? 0} | ${source.next_action} |`);
  const endpointLines = report.sources.flatMap((source) => source.network_endpoints.slice(0, 8).map((endpoint) => (
    `- ${source.id}: ${endpoint.method} ${endpoint.url} (${endpoint.status}, ${endpoint.response_shape})`
  )));
  const sampleRows = report.sources
    .filter((source) => (
      sampleDateSnippets(source).length
      || sampleEventLinks(source).length
      || sampleEndpointPreviews(source).length
    ))
    .map((source) => `| ${source.id} | ${joinedSamples(sampleDateSnippets(source))} | ${joinedSamples(sampleEventLinks(source))} | ${joinedSamples(sampleEndpointPreviews(source))} |`);
  const lines = [
    '# EventLive Browser Source Probe',
    '',
    `Generated at: ${report.generated_at}`,
    '',
    '## Summary',
    '',
    `- Sources probed: ${report.totals.probed}`,
    `- Browser network API: ${report.totals.browser_network_api}`,
    `- Hydration payload: ${report.totals.browser_hydration_payload}`,
    `- Rendered HTML candidates: ${report.totals.rendered_html_candidates}`,
    `- Blocked/protected: ${report.totals.blocked_or_protected}`,
    `- Policy skipped: ${report.totals.policy_skipped}`,
    '',
    '## Sources',
    '',
    '| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |',
    '|---:|---|---|---:|---|---:|---:|---:|---|',
    ...rows,
    '',
    '## Endpoint Candidates',
    '',
    ...(endpointLines.length ? endpointLines : ['- No endpoint candidates captured.']),
    '',
    '## Actionable Samples',
    '',
    '| Source | Date snippets | Event-like links | Endpoint previews |',
    '|---|---|---|---|',
    ...(sampleRows.length ? sampleRows : ['| - | - | - | - |'])
  ];
  return `${lines.join('\n')}\n`;
}

function totalsFor(results = []) {
  const byClassification = new Map();
  for (const source of results) {
    byClassification.set(source.classification, (byClassification.get(source.classification) || 0) + 1);
  }
  return {
    probed: results.length,
    browser_network_api: byClassification.get('browser-network-api') || 0,
    browser_hydration_payload: byClassification.get('browser-hydration-payload') || 0,
    rendered_html_candidates: byClassification.get('rendered-html-candidates') || 0,
    blocked_or_protected: byClassification.get('blocked-or-protected') || 0,
    policy_skipped: byClassification.get('policy-skipped-partnership') || 0
  };
}

function writeCheckpoint(sources, results) {
  writeJson(checkpointJsonPath, {
    schema: 'eventlive.source-browser-probe-checkpoint.v1',
    checkpointed_at: new Date().toISOString(),
    generated_at: generatedAt,
    source_registry: rel(registryPath),
    output_dir: rel(outputDir),
    sources_planned: sources.length,
    sources_completed: results.length,
    totals: totalsFor(results),
    completed_ids: results.map((source) => source.id),
    sources: results
  });
}

async function main() {
  if (!exists(registryPath)) throw new Error(`Source registry not found: ${rel(registryPath)}`);
  ensureDir(outputDir);
  const registry = readJson(registryPath);
  const sources = chooseProbeSources(registry);
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({
    headless: process.env.EVENTLIVE_BROWSER_HEADLESS === '0' ? false : true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const results = [];
  try {
    for (const [index, source] of sources.entries()) {
      console.log(`[browser-probe] ${index + 1}/${sources.length} ${source.id}`);
      results.push(await probeSource(browser, source));
      writeCheckpoint(sources, results);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const previousReport = exists(reportJsonPath) ? readJson(reportJsonPath) : {};
  const mergedResults = mergeRecentProbeResults(previousReport, results);
  const report = {
    generated_at: generatedAt,
    source_registry: rel(registryPath),
    collection_report: exists(collectionReportPath) ? rel(collectionReportPath) : '',
    output_dir: rel(outputDir),
    selection: {
      selected_ids: selectedIds,
      scope: probeScope,
      limit: selectedIds.length ? sources.length : probeLimit,
      probed_this_run: results.length,
      fresh_results_available: mergedResults.length,
      wait_ms: waitMs,
      timeout_ms: timeoutMs
    },
    methodology: 'Browser-level probe inspired by cafe platform work: classify fetchability, hydration payloads, network APIs, structured HTML, rendered DOM, and policy-protected lanes before writing extractors.',
    totals: {
      ...totalsFor(mergedResults)
    },
    sources: mergedResults
  };
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, renderMarkdown(report), 'utf8');
  console.log('# EventLive Browser Source Probe');
  console.log(`- Sources probed: ${report.totals.probed}`);
  console.log(`- Browser network API: ${report.totals.browser_network_api}`);
  console.log(`- Hydration payload: ${report.totals.browser_hydration_payload}`);
  console.log(`- Rendered HTML candidates: ${report.totals.rendered_html_candidates}`);
  console.log(`- Blocked/protected: ${report.totals.blocked_or_protected}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`SOURCE_BROWSER_PROBE_FAILED ${error.message}`);
    process.exit(1);
  });
}

export {
  analyzeHtmlSignals,
  classifyProbe,
  extractEndpointCandidates,
  isLikelyApiUrl,
  mergeRecentProbeResults,
  rankProbeSources,
  renderMarkdown,
  shouldCaptureNetwork
};
