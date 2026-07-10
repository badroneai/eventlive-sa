import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const leadsPath = path.join(rootDir, 'reports', 'platinumlist-snapshot-leads.json');
const platformRadarPath = path.join(rootDir, 'reports', 'platinumlist-platform-radar.json');
const reportsDir = path.join(rootDir, 'reports');
const rawDir = path.join(rootDir, 'data', 'raw', 'platinumlist-detail-radar');
const jsonReportPath = path.join(reportsDir, 'platinumlist-detail-radar.json');
const mdReportPath = path.join(reportsDir, 'platinumlist-detail-radar.md');

const generatedAt = new Date().toISOString();
const stamp = generatedAt.replace(/[:.]/g, '-');
const probeLimit = Math.max(1, Number(process.env.EVENTLIVE_PLATINUMLIST_DETAIL_LIMIT || 16));
const waitMs = Math.max(1200, Number(process.env.EVENTLIVE_PLATINUMLIST_DETAIL_WAIT_MS || 3200));
const timeoutMs = Math.max(10000, Number(process.env.EVENTLIVE_PLATINUMLIST_DETAIL_TIMEOUT_MS || 45000));
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

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
    .slice(0, 90) || 'platinumlist-detail';
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function cityFromUrl(url = '') {
  if (/riyadh\.platinumlist\.net/i.test(url)) return { city: 'Riyadh', city_ar: 'الرياض' };
  if (/jeddah\.platinumlist\.net/i.test(url)) return { city: 'Jeddah', city_ar: 'جدة' };
  if (/khobar\.platinumlist\.net/i.test(url)) return { city: 'Khobar', city_ar: 'الخبر' };
  if (/dammam\.platinumlist\.net/i.test(url)) return { city: 'Dammam', city_ar: 'الدمام' };
  if (/dhahran\.platinumlist\.net/i.test(url)) return { city: 'Dhahran', city_ar: 'الظهران' };
  if (/alula\.platinumlist\.net/i.test(url)) return { city: 'AlUla', city_ar: 'العلا' };
  return { city: 'Saudi Arabia', city_ar: 'السعودية' };
}

function hasQueueProtection(value = '') {
  return /queue-it|queueit|protectsaudi|general queue page|queue\.platinumlist\.net|waiting room/i.test(String(value || ''));
}

function extractJsonLd(html = '') {
  const blocks = [...String(html).matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => stripTags(match[1]).trim())
    .filter(Boolean);
  const parsed = [];
  for (const block of blocks) {
    try {
      const value = JSON.parse(block);
      parsed.push(value);
    } catch {
      parsed.push({ parse_error: true, preview: block.slice(0, 500) });
    }
  }
  return parsed;
}

function collectStructuredTypes(value, output = []) {
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    for (const item of value) collectStructuredTypes(item, output);
    return output;
  }
  if (value['@type']) output.push(String(value['@type']));
  for (const child of Object.values(value)) collectStructuredTypes(child, output);
  return output;
}

function selectLines(text = '', patterns = [], limit = 12) {
  const lines = String(text || '')
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length >= 2 && line.length <= 220);
  const matches = [];
  for (const line of lines) {
    if (patterns.some((pattern) => pattern.test(line))) matches.push(line);
    if (matches.length >= limit) break;
  }
  return unique(matches);
}

function extractImages(html = '', pageImages = []) {
  const htmlUrls = [...String(html).matchAll(/https:\/\/cdn\.platinumlist\.net\/upload\/event\/[^"' )]+/gi)].map((match) => match[0]);
  return unique([...pageImages, ...htmlUrls])
    .filter((url) => /\.(jpg|jpeg|png|webp|jp2)(?:$|\?)/i.test(url))
    .slice(0, 24);
}

function chooseBestImageUrl(urls = []) {
  const cleanRaster = urls.filter((url) => /\.(jpg|jpeg|png)$/i.test(url));
  return cleanRaster.find((url) => /[-_]full[-_]/i.test(url))
    || urls.find((url) => /[-_]full[-_]/i.test(url))
    || cleanRaster[0]
    || urls[0]
    || '';
}

export function classifyPlatinumlistDetail(signal = {}) {
  const haystack = `${signal.title || ''} ${signal.focus_text || signal.text || ''} ${signal.url || ''}`.toLowerCase();
  const fullText = `${signal.text || ''}`.toLowerCase();
  const structuredTypes = (signal.structured_types || []).map((item) => item.toLowerCase());
  const hasEventSchema = structuredTypes.some((type) => type.includes('event'));
  const hasStrongDate = /20\d{2}|يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(haystack);
  const hasLiveTiming = Number(signal.live_timing_count || 0) > 0
    || /تفتح الأبواب|فتح الأبواب|يبدأ العرض|بداية العرض|ينتهي|نهاية|doors open|show starts|event ends|opening time|closing time/i.test(fullText);
  const isEnded = /انتهت هذه الفعالية|sold out|event has ended|this event has ended/i.test(haystack);
  const experienceSignals = /waterpark|theme park|aquarabia|six flags|bounce|kidzania|tour|trip|yacht|horse riding|beach|resort|hotel|park|شاطئ|منتجع|حديقة|جولة|رحلة|يخت|ركوب الخيل|تجربة/i.test(haystack);
  const businessSignals = /conference|summit|expo|exhibition|forum|workshop|awards|registration|مؤتمر|ملتقى|معرض|ورشة|جوائز|تسجيل/i.test(haystack);
  const sportsSignals = /sports|fight|football|basketball|fiba|pfl|world cup|مباراة|كأس العالم|كرة/i.test(haystack);
  const entertainmentSignals = /concert|comedy|stand up|show|theater|music|live|night|مسرح|كوميدي|حفلة|غنائي|ليلة|عرض/i.test(haystack);

  let radar_kind = 'needs-review-radar';
  if (isEnded) radar_kind = 'ended-event-radar';
  else if (experienceSignals && !hasLiveTiming && !hasEventSchema) radar_kind = 'ongoing-experience-radar';
  else if (hasLiveTiming && (hasStrongDate || hasEventSchema)) radar_kind = 'live-timing-event-radar';
  else if (hasStrongDate || hasEventSchema) radar_kind = 'dated-event-radar';
  else if (experienceSignals) radar_kind = 'ongoing-experience-radar';

  const taxonomy_radar = [];
  if (businessSignals) taxonomy_radar.push('business-conference-workshop');
  if (sportsSignals) taxonomy_radar.push('sports-fanzone-match');
  if (entertainmentSignals) taxonomy_radar.push('entertainment-shows-nightlife');
  if (experienceSignals) taxonomy_radar.push('attraction-tour-experience');
  if (!taxonomy_radar.length) taxonomy_radar.push('uncategorized-review');

  return {
    radar_kind,
    taxonomy_radar,
    confidence: radar_kind === 'needs-review-radar' ? 'low' : hasLiveTiming || hasEventSchema ? 'medium' : 'low',
    public_handling: radar_kind === 'live-timing-event-radar' || radar_kind === 'dated-event-radar'
      ? 'can-be-shown-as-ticketing-radar-after-secondary-verification'
      : 'owner-radar-until-product-model-supports-it',
    publishable_without_secondary_verification: false
  };
}

export function parseDetailSignals({ url = '', html = '', text = '', title = '', meta = {}, images = [] }) {
  const structured_data = extractJsonLd(html);
  const structured_types = unique(collectStructuredTypes(structured_data));
  const date_lines = selectLines(text, [
    /20\d{2}|يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر/i,
    /الخميس|الجمعة|السبت|الأحد|الاحد|الاثنين|الثلاثاء|الأربعاء|الاربعاء/i,
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i
  ]).filter((line) => !/ما الجديد|الصفحة الرئيسية|مشاهدة مباريات كرة القدم 2026|920008640/i.test(line));
  const live_timing_lines = selectLines(text, [
    /تفتح الأبواب|فتح الأبواب|يبدأ العرض|بداية العرض|ينتهي|نهاية|doors open|show starts|event ends|opening time|closing time/i
  ]);
  const venue_lines = selectLines(text, [
    /الموقع|المكان|العنوان|venue|location|address|riyadh|jeddah|الرياض|جدة/i
  ]).filter((line) => !/ما الجديد|الصفحة الرئيسية/i.test(line));
  const price_lines = selectLines(text, [
    /SAR|ريال|ر\.س|التذاكر|ticket|price|from/i
  ]);
  const allImages = extractImages(html, images);
  const cityInfo = cityFromUrl(url);
  const normalizedTitle = normalizeWhitespace(title || meta.ogTitle || meta.twitterTitle || '');
  const signal = {
    url,
    title: normalizedTitle,
    text,
    focus_text: `${normalizedTitle} ${url} ${date_lines.join(' ')} ${live_timing_lines.join(' ')}`,
    live_timing_count: live_timing_lines.length,
    structured_types
  };
  const classification = classifyPlatinumlistDetail(signal);
  return {
    url,
    title: normalizedTitle,
    city: cityInfo.city,
    city_ar: cityInfo.city_ar,
    meta_description: normalizeWhitespace(meta.description || meta.ogDescription || ''),
    structured_types,
    has_event_schema: structured_types.some((type) => /event/i.test(type)),
    date_lines,
    live_timing_lines,
    venue_lines,
    price_lines,
    images: allImages,
    best_image_url: chooseBestImageUrl(allImages),
    ...classification
  };
}

export function chooseProbeLeads(report, platformReport = {}) {
  const rich = (report.leads || []).map((lead) => ({ ...lead, lead_type: 'rich-card' }));
  const linkOnly = (report.link_only_leads || []).map((lead) => ({ ...lead, lead_type: 'link-only' }));
  const platformLeads = (platformReport.routes || []).flatMap((route) => (route.event_links || []).map((lead) => ({
    ...lead,
    city: route.city || cityFromUrl(lead.url).city,
    lead_type: 'platform-city-radar'
  })));
  const interesting = [...platformLeads, ...rich, ...linkOnly].filter((lead) => /riyadh|jeddah|khobar|dammam|dhahran/i.test(lead.url));
  const rank = (lead) => (
    (lead.best_image_url ? 2 : 0)
    + (/conference|workshop|expo|award|world-cup|fiba|pfl|stand-up|comedy|music|concert|مؤتمر|ورشة|معرض|كأس|كوميدي/i.test(`${lead.title} ${lead.url}`) ? 2 : 0)
  );
  const buckets = [
    interesting.filter((lead) => /pfl|fiba|world-cup|fan-zone|كأس|مباراة|كرة/i.test(`${lead.title} ${lead.url}`)),
    interesting.filter((lead) => /stand-up|comedy|concert|music|night|show|theater|كوميدي|حفلة|ليلة|مسرح|عرض/i.test(`${lead.title} ${lead.url}`)),
    interesting.filter((lead) => /workshop|conference|expo|award|registration|ورشة|مؤتمر|معرض|جوائز|تسجيل/i.test(`${lead.title} ${lead.url}`)),
    interesting.filter((lead) => /waterpark|theme park|aquarabia|six flags|bounce|kidzania|tour|trip|horse|beach|resort|park|شاطئ|منتجع|حديقة|جولة|رحلة|يخت|ركوب الخيل|تجربة/i.test(`${lead.title} ${lead.url}`)),
    interesting
  ].map((bucket) => bucket.sort((a, b) => rank(b) - rank(a) || a.title.localeCompare(b.title)));

  const priority = interesting.filter((lead) => /khobar/i.test(lead.url)).sort((a, b) => rank(b) - rank(a));
  let cursor = 0;
  while (priority.length < interesting.length && buckets.some((bucket) => cursor < bucket.length)) {
    for (const bucket of buckets) {
      if (bucket[cursor]) priority.push(bucket[cursor]);
    }
    cursor += 1;
  }
  const fallback = interesting.sort((a, b) => {
    const aScore = (a.best_image_url ? 2 : 0) + (/conference|workshop|expo|award|world-cup|fiba|pfl|stand-up|comedy|music|concert|مؤتمر|ورشة|معرض|كأس|كوميدي/i.test(`${a.title} ${a.url}`) ? 2 : 0);
    const bScore = (b.best_image_url ? 2 : 0) + (/conference|workshop|expo|award|world-cup|fiba|pfl|stand-up|comedy|music|concert|مؤتمر|ورشة|معرض|كأس|كوميدي/i.test(`${b.title} ${b.url}`) ? 2 : 0);
    return bScore - aScore || a.title.localeCompare(b.title);
  });
  priority.push(...fallback);
  const byUrl = new Map();
  for (const lead of priority) {
    if (!byUrl.has(lead.url)) byUrl.set(lead.url, lead);
    if (byUrl.size >= probeLimit) break;
  }
  return [...byUrl.values()];
}

async function importPlaywright() {
  try {
    return await import('playwright');
  } catch (error) {
    throw new Error(`Playwright is required for Platinumlist detail radar. (${error.message})`);
  }
}

async function probeDetail(browser, lead, index) {
  const page = await browser.newPage({
    userAgent,
    extraHTTPHeaders: {
      'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });
  let httpStatus = 0;
  let navigationError = '';
  try {
    const response = await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    httpStatus = response?.status() || 0;
    await page.waitForLoadState('networkidle', { timeout: Math.min(10000, waitMs + 2500) }).catch(() => {});
    await page.waitForTimeout(waitMs);
  } catch (error) {
    navigationError = error.message;
  }

  const html = await page.content().catch(() => '');
  const pageData = await page.evaluate(() => {
    const metaBy = (selector) => document.querySelector(selector)?.getAttribute('content') || '';
    return {
      title: document.querySelector('h1')?.innerText || document.title || '',
      text: document.body?.innerText || '',
      meta: {
        description: metaBy('meta[name="description"]'),
        ogTitle: metaBy('meta[property="og:title"]'),
        ogDescription: metaBy('meta[property="og:description"]'),
        ogImage: metaBy('meta[property="og:image"]'),
        twitterTitle: metaBy('meta[name="twitter:title"]')
      },
      images: [...document.images].map((image) => image.currentSrc || image.src).filter(Boolean)
    };
  }).catch(() => ({ title: '', text: '', meta: {}, images: [] }));

  const rawName = `${String(index + 1).padStart(2, '0')}-${safeSlug(lead.title || lead.url)}-${stamp}`;
  const htmlPath = path.join(rawDir, `${rawName}.html`);
  const screenshotPath = path.join(rawDir, `${rawName}.png`);
  fs.writeFileSync(htmlPath, html, 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  const finalUrl = page.url();
  await page.close().catch(() => {});

  const protectedPage = httpStatus === 403 || hasQueueProtection(`${finalUrl}\n${html}\n${pageData.text}`);
  const parsed = protectedPage
    ? {
      url: lead.url,
      title: lead.title || '',
      city: cityFromUrl(lead.url).city,
      city_ar: cityFromUrl(lead.url).city_ar,
      radar_kind: 'protected-detail-radar',
      taxonomy_radar: ['protected-review'],
      confidence: 'low',
      public_handling: 'owner-radar-until-access-or-partnership',
      publishable_without_secondary_verification: false,
      structured_types: [],
      date_lines: [],
      live_timing_lines: [],
      venue_lines: [],
      price_lines: [],
      images: [],
      best_image_url: ''
    }
    : parseDetailSignals({
      url: finalUrl || lead.url,
      html,
      text: pageData.text,
      title: pageData.title || lead.title,
      meta: pageData.meta,
      images: [pageData.meta?.ogImage, ...(pageData.images || [])]
    });

  return {
    source_lead_type: lead.lead_type,
    source_title: lead.title,
    source_url: lead.url,
    final_url: finalUrl || lead.url,
    http_status: httpStatus,
    navigation_error: navigationError,
    protected_or_blocked: protectedPage,
    html_snapshot: path.relative(rootDir, htmlPath),
    screenshot: fs.existsSync(screenshotPath) ? path.relative(rootDir, screenshotPath) : '',
    ...parsed
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Platinumlist Detail Radar');
  lines.push('');
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Details probed: ${report.totals.probed}`);
  lines.push(`- Protected/blocked: ${report.totals.protected_or_blocked}`);
  lines.push(`- With event schema: ${report.totals.with_event_schema}`);
  lines.push(`- With live timing lines: ${report.totals.with_live_timing}`);
  lines.push(`- With best image: ${report.totals.with_best_image}`);
  lines.push('');
  lines.push('## Radar Kinds');
  lines.push('');
  lines.push('| Radar kind | Count |');
  lines.push('|---|---:|');
  for (const [kind, count] of Object.entries(report.by_radar_kind)) {
    lines.push(`| ${kind} | ${count} |`);
  }
  lines.push('');
  lines.push('## Taxonomy Radar');
  lines.push('');
  lines.push('| Taxonomy | Count |');
  lines.push('|---|---:|');
  for (const [kind, count] of Object.entries(report.by_taxonomy)) {
    lines.push(`| ${kind} | ${count} |`);
  }
  lines.push('');
  lines.push('## Detail Samples');
  lines.push('');
  lines.push('| City | Title | Radar | Taxonomy | Dates | Live timing | Venue/location hints | Image | URL |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const item of report.details) {
    lines.push(`| ${item.city_ar} | ${normalizeWhitespace(item.title || item.source_title).replace(/\|/g, '/')} | ${item.radar_kind} | ${(item.taxonomy_radar || []).join(', ')} | ${(item.date_lines || []).slice(0, 2).join('<br>').replace(/\|/g, '/')} | ${(item.live_timing_lines || []).slice(0, 2).join('<br>').replace(/\|/g, '/')} | ${(item.venue_lines || []).slice(0, 2).join('<br>').replace(/\|/g, '/')} | ${item.best_image_url ? 'yes' : 'no'} | ${item.final_url || item.source_url} |`);
  }
  lines.push('');
  lines.push('## Operating Rule');
  lines.push('');
  lines.push('- Treat all results as radar, not published events.');
  lines.push('- Promote only after official secondary verification.');
  lines.push('- Keep ongoing attractions/experiences out of live event counters until EventLive has a separate product model for experiences.');
  lines.push('- Use live timing lines as high-value candidates for EventLive live schedule pages.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function summarize(details) {
  const by_radar_kind = {};
  const by_taxonomy = {};
  for (const item of details) {
    by_radar_kind[item.radar_kind] = (by_radar_kind[item.radar_kind] || 0) + 1;
    for (const taxonomy of item.taxonomy_radar || []) by_taxonomy[taxonomy] = (by_taxonomy[taxonomy] || 0) + 1;
  }
  return {
    probed: details.length,
    protected_or_blocked: details.filter((item) => item.protected_or_blocked).length,
    with_event_schema: details.filter((item) => item.has_event_schema).length,
    with_live_timing: details.filter((item) => (item.live_timing_lines || []).length).length,
    with_best_image: details.filter((item) => item.best_image_url).length,
    by_radar_kind,
    by_taxonomy
  };
}

async function main() {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(rawDir, { recursive: true });
  const leadReport = fs.existsSync(leadsPath) ? JSON.parse(fs.readFileSync(leadsPath, 'utf8')) : {};
  const platformReport = fs.existsSync(platformRadarPath) ? JSON.parse(fs.readFileSync(platformRadarPath, 'utf8')) : {};
  const leads = chooseProbeLeads(leadReport, platformReport);
  if (!leads.length) throw new Error('No Platinumlist detail leads available from snapshot or platform radar.');
  const { chromium } = await importPlaywright();
  const browser = await chromium.launch({
    headless: process.env.EVENTLIVE_BROWSER_HEADLESS === '0' ? false : true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const details = [];
  try {
    for (const [index, lead] of leads.entries()) {
      console.log(`[platinumlist-detail] ${index + 1}/${leads.length} ${lead.title}`);
      details.push(await probeDetail(browser, lead, index));
    }
  } finally {
    await browser.close().catch(() => {});
  }
  const dedupedDetails = [...new Map(details.map((detail) => [detail.final_url || detail.source_url, detail])).values()];
  const summary = summarize(dedupedDetails);
  const report = {
    generated_at: generatedAt,
    source_leads: [path.relative(rootDir, leadsPath), path.relative(rootDir, platformRadarPath)],
    probe_limit: probeLimit,
    policy: {
      intake_policy: 'candidate-only',
      publication_rule: 'Secondary official verification required before EventLive publication.',
      taxonomy_status: 'radar-for-development'
    },
    totals: {
      probed: summary.probed,
      protected_or_blocked: summary.protected_or_blocked,
      with_event_schema: summary.with_event_schema,
      with_live_timing: summary.with_live_timing,
      with_best_image: summary.with_best_image
    },
    by_radar_kind: summary.by_radar_kind,
    by_taxonomy: summary.by_taxonomy,
    details: dedupedDetails
  };
  fs.writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdReportPath, renderMarkdown(report));
  console.log('# Platinumlist detail radar');
  console.log(`- probed: ${report.totals.probed}`);
  console.log(`- protected_or_blocked: ${report.totals.protected_or_blocked}`);
  console.log(`- with_event_schema: ${report.totals.with_event_schema}`);
  console.log(`- with_live_timing: ${report.totals.with_live_timing}`);
  console.log(`- report: ${path.relative(rootDir, mdReportPath)}`);
}

if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error(`PLATINUMLIST_DETAIL_RADAR_FAILED ${error.message}`);
    process.exit(1);
  });
}
