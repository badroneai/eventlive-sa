import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');
const rawDir = path.join(rootDir, 'data', 'raw', 'platinumlist-platform-radar');
const sourceRegistryPath = path.join(rootDir, 'data', 'source_registry.json');
const jsonReportPath = path.join(reportsDir, 'platinumlist-platform-radar.json');
const mdReportPath = path.join(reportsDir, 'platinumlist-platform-radar.md');
const generatedAt = new Date().toISOString();
const stamp = generatedAt.replace(/[:.]/g, '-');
const routeLimit = Math.max(1, Number(process.env.EVENTLIVE_PLATINUMLIST_PLATFORM_LIMIT || 22));
const waitMs = Math.max(1200, Number(process.env.EVENTLIVE_PLATINUMLIST_PLATFORM_WAIT_MS || 2800));
const timeoutMs = Math.max(10000, Number(process.env.EVENTLIVE_PLATINUMLIST_PLATFORM_TIMEOUT_MS || 45000));
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const routeSeeds = [
  { lane: 'riyadh-time', url: 'https://riyadh.platinumlist.net/ar/calendar/today' },
  { lane: 'riyadh-time', url: 'https://riyadh.platinumlist.net/ar/calendar/this-weekend' },
  { lane: 'riyadh-time', url: 'https://riyadh.platinumlist.net/ar/calendar/july' },
  { lane: 'riyadh-all', url: 'https://riyadh.platinumlist.net/ar/event' },
  { lane: 'riyadh-category', url: 'https://riyadh.platinumlist.net/ar/shows' },
  { lane: 'riyadh-category', url: 'https://riyadh.platinumlist.net/ar/business-events' },
  { lane: 'riyadh-category', url: 'https://riyadh.platinumlist.net/ar/concert' },
  { lane: 'riyadh-category', url: 'https://riyadh.platinumlist.net/ar/calendar/today/comedy' },
  { lane: 'riyadh-category', url: 'https://riyadh.platinumlist.net/ar/calendar/today/sport' },
  { lane: 'riyadh-category', url: 'https://riyadh.platinumlist.net/ar/calendar/today/gaming' },
  { lane: 'jeddah-time', url: 'https://jeddah.platinumlist.net/ar/calendar/today' },
  { lane: 'jeddah-time', url: 'https://jeddah.platinumlist.net/ar/calendar/this-weekend' },
  { lane: 'jeddah-time', url: 'https://jeddah.platinumlist.net/ar/calendar/july' },
  { lane: 'jeddah-all', url: 'https://jeddah.platinumlist.net/ar/event' },
  { lane: 'jeddah-category', url: 'https://jeddah.platinumlist.net/ar/shows' },
  { lane: 'jeddah-category', url: 'https://jeddah.platinumlist.net/ar/business-events' },
  { lane: 'jeddah-category', url: 'https://jeddah.platinumlist.net/ar/calendar/today/sport' },
  { lane: 'city-radar', url: 'https://khobar.platinumlist.net/' },
  { lane: 'city-radar', url: 'https://dammam.platinumlist.net/' },
  { lane: 'city-radar', url: 'https://alula.platinumlist.net/' },
  { lane: 'season-radar', url: 'https://aseer-experiences.platinumlist.net/' },
  { lane: 'organizer-radar', url: 'https://platinumlist.net/for-organisers/' },
  { lane: 'organizer-radar', url: 'https://platinumlist.net/ar/event/add' },
  { lane: 'sitemap-radar', url: 'https://platinumlist.net/sitemap' }
];

function normalizeWhitespace(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripTags(value = '') {
  return normalizeWhitespace(String(value || '').replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'"));
}

function safeSlug(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'platform-route';
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function cityFromUrl(url = '') {
  const host = (String(url).match(/^https?:\/\/([^/]+)/i)?.[1] || '').replace('.platinumlist.net', '');
  const map = {
    riyadh: ['Riyadh', 'الرياض'],
    jeddah: ['Jeddah', 'جدة'],
    khobar: ['Khobar', 'الخبر'],
    dammam: ['Dammam', 'الدمام'],
    alula: ['AlUla', 'العلا'],
    'aseer-experiences': ['Aseer', 'عسير']
  };
  const found = map[host] || ['Saudi Arabia', 'السعودية'];
  return { city: found[0], city_ar: found[1], host };
}

function hasQueueProtection(value = '') {
  return /queue-it|queueit|protectsaudi|general queue page|queue\.platinumlist\.net|waiting room/i.test(String(value || ''));
}

function normalizeUrl(url = '', base = 'https://platinumlist.net') {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) {
    const origin = new URL(base).origin;
    return `${origin}${url}`;
  }
  return url;
}

function routeIntent(url = '', title = '') {
  const value = `${url} ${title}`.toLowerCase();
  const intents = [];
  if (/calendar\/today|today|اليوم/.test(value)) intents.push('today');
  if (/this-weekend|weekend|عطلة|ويكند/.test(value)) intents.push('weekend');
  if (/calendar\/july|this-month|month|الشهر/.test(value)) intents.push('month');
  if (/business|conference|expo|workshop|معرض|مؤتمر|ورشة|قطاع الأعمال/.test(value)) intents.push('business');
  if (/shows|theater|comedy|stand-up|مسرح|كوميدي|عروض/.test(value)) intents.push('shows-comedy');
  if (/concert|music|حفلات|موسيقى/.test(value)) intents.push('concerts');
  if (/sport|fanzone|world-cup|رياض|كأس/.test(value)) intents.push('sports-fanzones');
  if (/gaming|esports|ألعاب|رياضات إلكترونية/.test(value)) intents.push('gaming-esports');
  if (/event\/?$|all events|كل الفعاليات/.test(value)) intents.push('all-events');
  if (/for-organisers|event\/add|organiser|إضافة فعالية/.test(value)) intents.push('organizer-acquisition');
  if (/sitemap/.test(value)) intents.push('sitemap-network');
  return intents.length ? intents : ['general-discovery'];
}

function extractSearchConfig(html = '') {
  const configs = [];
  for (const match of String(html).matchAll(/data-ui-search="([^"]+)"/gi)) {
    const decoded = match[1]
      .replace(/&#x7B;/g, '{')
      .replace(/&#x7D;/g, '}')
      .replace(/&quot;/g, '"')
      .replace(/&#x3A;/g, ':')
      .replace(/&#x5C;/g, '\\')
      .replace(/&#x2F;/g, '/');
    configs.push(stripTags(decoded));
  }
  return unique(configs);
}

function extractCityNetwork(html = '') {
  const rows = [];
  for (const match of String(html).matchAll(/<a[^>]+href="(https?:\/\/([^./]+)\.platinumlist\.net\/?)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1];
    const host = match[2];
    const text = stripTags(match[3]);
    if (!text) continue;
    rows.push({ host, text, href });
  }
  return [...new Map(rows.map((row) => [row.host, row])).values()];
}

function extractEventLinks(links = []) {
  const rows = links
    .filter((link) => /\/event-tickets\//i.test(link.href))
    .map((link) => ({
      title: normalizeWhitespace(link.text || decodeURIComponent(String(link.href).split('/').pop() || '').replace(/[-_]+/g, ' ')),
      url: link.href
    }))
    .filter((link) => link.url && link.title);
  return [...new Map(rows.map((row) => [row.url, row])).values()];
}

function extractRouteLinks(links = []) {
  const rows = links
    .filter((link) => /\/calendar\/|\/business-events|\/shows|\/concert|\/event\/?$|\/event\/list|\/event\/top|\/event\/add|for-organisers|membership|b2capp|helpcenter/i.test(link.href))
    .map((link) => ({
      title: normalizeWhitespace(link.text || link.href),
      url: link.href,
      intents: routeIntent(link.href, link.text)
    }))
    .filter((link) => link.url && link.title);
  return [...new Map(rows.map((row) => [row.url, row])).values()].slice(0, 80);
}

function extractOperationalSignals(text = '', links = [], html = '') {
  const normalizedText = normalizeWhitespace(text);
  return {
    has_ai_search_copy: /Smart AI Search|AI Search|البحث|اسأل/i.test(normalizedText),
    has_mobile_app_push: links.some((link) => /b2capp|get the app|التطبيق/i.test(`${link.href} ${link.text}`)),
    has_membership: /membership|platinumlist plus|خصم|Plus/i.test(`${normalizedText} ${links.map((link) => link.href).join(' ')}`),
    has_organizer_cta: /sell your event|for organisers|إضافة فعالية|بيع تذاكر|منظم/i.test(`${normalizedText} ${links.map((link) => link.href).join(' ')}`),
    has_waiting_room: hasQueueProtection(`${normalizedText} ${html}`),
    search_configs: extractSearchConfig(html)
  };
}

async function importPlaywright() {
  try {
    return await import('playwright');
  } catch (error) {
    throw new Error(`Playwright is required for Platinumlist platform radar. (${error.message})`);
  }
}

async function probeRoute(browser, route, index) {
  const page = await browser.newPage({
    userAgent,
    extraHTTPHeaders: {
      'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  let httpStatus = 0;
  let navigationError = '';
  try {
    const response = await page.goto(route.url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    httpStatus = response?.status() || 0;
    await page.waitForLoadState('networkidle', { timeout: Math.min(10000, waitMs + 2500) }).catch(() => {});
    await page.waitForTimeout(waitMs);
  } catch (error) {
    navigationError = error.message;
  }
  const html = await page.content().catch(() => '');
  const data = await page.evaluate(() => ({
    title: document.title || '',
    h1: document.querySelector('h1')?.innerText || '',
    text: document.body?.innerText || '',
    links: [...document.querySelectorAll('a[href]')].map((link) => ({
      text: (link.innerText || link.getAttribute('aria-label') || '').trim().slice(0, 160),
      href: link.href
    }))
  })).catch(() => ({ title: '', h1: '', text: '', links: [] }));

  const baseName = `${String(index + 1).padStart(2, '0')}-${safeSlug(route.lane)}-${safeSlug(route.url)}-${stamp}`;
  const htmlPath = path.join(rawDir, `${baseName}.html`);
  const screenshotPath = path.join(rawDir, `${baseName}.png`);
  fs.writeFileSync(htmlPath, html, 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  const finalUrl = page.url();
  await page.close().catch(() => {});

  const city = cityFromUrl(finalUrl || route.url);
  const eventLinks = extractEventLinks(data.links);
  const routeLinks = extractRouteLinks(data.links);
  const cityNetwork = route.lane === 'sitemap-radar' ? extractCityNetwork(html) : [];
  const operational = extractOperationalSignals(data.text, data.links, html);
  return {
    lane: route.lane,
    seed_url: route.url,
    final_url: finalUrl || route.url,
    http_status: httpStatus,
    navigation_error: navigationError,
    protected_or_blocked: httpStatus === 403 || operational.has_waiting_room,
    title: data.title,
    h1: data.h1,
    city: city.city,
    city_ar: city.city_ar,
    host: city.host,
    route_intents: routeIntent(finalUrl || route.url, `${data.title} ${data.h1}`),
    event_links_count: eventLinks.length,
    event_links: eventLinks.slice(0, 35),
    route_links: routeLinks,
    city_network_count: cityNetwork.length,
    city_network: cityNetwork,
    operational_signals: operational,
    html_snapshot: path.relative(rootDir, htmlPath),
    screenshot: fs.existsSync(screenshotPath) ? path.relative(rootDir, screenshotPath) : ''
  };
}

function summarize(routes = []) {
  const allEvents = new Map();
  const byLane = {};
  const byIntent = {};
  const cityNetwork = new Map();
  let protectedCount = 0;
  let aiSearchRoutes = 0;
  let organizerCtaRoutes = 0;
  for (const route of routes) {
    byLane[route.lane] ||= { routes: 0, event_links: 0 };
    byLane[route.lane].routes += 1;
    byLane[route.lane].event_links += route.event_links_count;
    if (route.protected_or_blocked) protectedCount += 1;
    if (route.operational_signals?.has_ai_search_copy) aiSearchRoutes += 1;
    if (route.operational_signals?.has_organizer_cta) organizerCtaRoutes += 1;
    for (const intent of route.route_intents || []) byIntent[intent] = (byIntent[intent] || 0) + 1;
    for (const event of route.event_links || []) allEvents.set(event.url, event);
    for (const city of route.city_network || []) cityNetwork.set(city.host, city);
  }
  const registryCityNetwork = loadRegistryCityNetwork();
  for (const city of registryCityNetwork) cityNetwork.set(city.host, city);
  return {
    routes_probed: routes.length,
    protected_or_blocked: protectedCount,
    unique_event_links: allEvents.size,
    city_network_hosts: cityNetwork.size,
    ai_search_routes: aiSearchRoutes,
    organizer_cta_routes: organizerCtaRoutes,
    by_lane: byLane,
    by_intent: byIntent,
    unique_event_samples: [...allEvents.values()].slice(0, 80),
    city_network: [...cityNetwork.values()].sort((a, b) => a.text.localeCompare(b.text)),
    registry_city_network: registryCityNetwork
  };
}

function loadRegistryCityNetwork() {
  if (!fs.existsSync(sourceRegistryPath)) return [];
  try {
    const registry = JSON.parse(fs.readFileSync(sourceRegistryPath, 'utf8'));
    const source = (registry.sources || []).find((item) => item.id === 'platinumlist-saudi-city-network');
    return (source?.collector_pages || [])
      .filter((url) => /\.platinumlist\.net\/?$/i.test(url) && !/platinumlist\.net\/sitemap/i.test(url))
      .map((url) => {
        const host = new URL(url).hostname.replace('.platinumlist.net', '');
        return {
          host,
          text: host.replace(/-/g, ' '),
          href: url,
          evidence: 'source-registry-city-network'
        };
      });
  } catch {
    return [];
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Platinumlist Platform Radar');
  lines.push('');
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Routes probed: ${report.totals.routes_probed}`);
  lines.push(`- Protected/blocked routes: ${report.totals.protected_or_blocked}`);
  lines.push(`- Unique event links observed: ${report.totals.unique_event_links}`);
  lines.push(`- City network hosts observed: ${report.totals.city_network_hosts}`);
  lines.push(`- Routes with AI-search signals: ${report.totals.ai_search_routes}`);
  lines.push(`- Routes with organizer CTA signals: ${report.totals.organizer_cta_routes}`);
  lines.push('');
  lines.push('## Lanes');
  lines.push('');
  lines.push('| Lane | Routes | Event links |');
  lines.push('|---|---:|---:|');
  for (const [lane, stats] of Object.entries(report.totals.by_lane)) {
    lines.push(`| ${lane} | ${stats.routes} | ${stats.event_links} |`);
  }
  lines.push('');
  lines.push('## Route Intents');
  lines.push('');
  lines.push('| Intent | Routes |');
  lines.push('|---|---:|');
  for (const [intent, count] of Object.entries(report.totals.by_intent)) {
    lines.push(`| ${intent} | ${count} |`);
  }
  lines.push('');
  lines.push('## Route Findings');
  lines.push('');
  lines.push('| Lane | City | Intent | Events | AI/Search | Organizer | URL |');
  lines.push('|---|---|---|---:|---|---|---|');
  for (const route of report.routes) {
    lines.push(`| ${route.lane} | ${route.city_ar} | ${(route.route_intents || []).join(', ')} | ${route.event_links_count} | ${route.operational_signals.has_ai_search_copy ? 'yes' : 'no'} | ${route.operational_signals.has_organizer_cta ? 'yes' : 'no'} | ${route.final_url} |`);
  }
  lines.push('');
  lines.push('## City Network Samples');
  lines.push('');
  lines.push('| City/host | URL |');
  lines.push('|---|---|');
  for (const city of report.totals.city_network.slice(0, 60)) {
    lines.push(`| ${city.text} / ${city.host} | ${city.href} |`);
  }
  lines.push('');
  lines.push('## Event Link Samples');
  lines.push('');
  lines.push('| Title | URL |');
  lines.push('|---|---|');
  for (const event of report.totals.unique_event_samples.slice(0, 60)) {
    lines.push(`| ${event.title.replace(/\|/g, '/')} | ${event.url} |`);
  }
  lines.push('');
  lines.push('## EventLive Implications');
  lines.push('');
  lines.push('- Build city + time-intent pages as first-class surfaces: today, weekend, month, all events.');
  lines.push('- Keep organizer acquisition as a product lane, not hidden copy.');
  lines.push('- Consider an EventLive search assistant later, but only after data quality is stable.');
  lines.push('- Treat attractions/tours as a separate future lane from live event counters.');
  lines.push('- Continue using Platinumlist as candidate-only radar and partnership/API target.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(rawDir, { recursive: true });
  const routes = routeSeeds.slice(0, routeLimit);
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({
    headless: process.env.EVENTLIVE_BROWSER_HEADLESS === '0' ? false : true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const results = [];
  try {
    for (const [index, route] of routes.entries()) {
      console.log(`[platinumlist-platform] ${index + 1}/${routes.length} ${route.lane} ${route.url}`);
      results.push(await probeRoute(browser, route, index));
    }
  } finally {
    await browser.close().catch(() => {});
  }
  const report = {
    generated_at: generatedAt,
    policy: {
      source_role: 'competitive-radar-and-discovery',
      publication_policy: 'candidate-only; no direct EventLive publication without secondary verification',
      no_bypass: true
    },
    totals: summarize(results),
    routes: results
  };
  fs.writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdReportPath, renderMarkdown(report));
  console.log('# Platinumlist platform radar');
  console.log(`- routes: ${report.totals.routes_probed}`);
  console.log(`- protected_or_blocked: ${report.totals.protected_or_blocked}`);
  console.log(`- unique_event_links: ${report.totals.unique_event_links}`);
  console.log(`- city_network_hosts: ${report.totals.city_network_hosts}`);
  console.log(`- report: ${path.relative(rootDir, mdReportPath)}`);
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error(`PLATINUMLIST_PLATFORM_RADAR_FAILED ${error.message}`);
    process.exit(1);
  });
}
