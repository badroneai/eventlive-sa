import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const rawDir = path.join(rootDir, 'data/raw/browser-probes');
const reportsDir = path.join(rootDir, 'reports');
const jsonReportPath = path.join(reportsDir, 'platinumlist-snapshot-leads.json');
const mdReportPath = path.join(reportsDir, 'platinumlist-snapshot-leads.md');
const browserProbeReportPath = path.join(reportsDir, 'source-browser-probe-report.json');

const PLATINUMLIST_SOURCE_POLICY = {
  intake_policy: 'candidate-only',
  publication_rule: 'Do not auto-publish from Platinumlist marketplace snapshots. Use as discovery evidence, then verify from organizer or official source before promotion.',
  allowed_use: 'source discovery, image lead discovery, duplicate matching, SEO taxonomy research'
};

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(value = '') {
  return decodeHtml(String(value).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function inferCityFromPath(filePath = '') {
  const lowered = filePath.toLowerCase();
  if (lowered.includes('riyadh')) return { city: 'Riyadh', city_ar: 'الرياض' };
  if (lowered.includes('jeddah')) return { city: 'Jeddah', city_ar: 'جدة' };
  if (lowered.includes('khobar')) return { city: 'Khobar', city_ar: 'الخبر' };
  if (lowered.includes('dammam')) return { city: 'Dammam', city_ar: 'الدمام' };
  if (lowered.includes('alula')) return { city: 'AlUla', city_ar: 'العلا' };
  return { city: 'Saudi Arabia', city_ar: 'السعودية' };
}

function inferSourceIdFromPath(filePath = '') {
  const lowered = filePath.toLowerCase();
  if (lowered.includes('platinumlist-riyadh')) return 'platinumlist-riyadh';
  if (lowered.includes('platinumlist-jeddah')) return 'platinumlist-jeddah';
  if (lowered.includes('platinumlist')) return 'platinumlist-saudi';
  return 'platinumlist-snapshot';
}

function normalizeUrl(url = '') {
  const decoded = decodeHtml(url).trim();
  if (!decoded) return '';
  if (decoded.startsWith('//')) return `https:${decoded}`;
  if (decoded.startsWith('/')) return `https://platinumlist.net${decoded}`;
  return decoded;
}

function extractAttribute(block, attributeName) {
  const match = block.match(new RegExp(`${attributeName}="([^"]+)"`, 'i'));
  return match ? decodeHtml(match[1]).trim() : '';
}

function extractAllAttributeUrls(block, attributeName) {
  const matches = [...block.matchAll(new RegExp(`${attributeName}="([^"]+)"`, 'gi'))];
  const urls = [];
  for (const match of matches) {
    const raw = decodeHtml(match[1]);
    for (const part of raw.split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url.includes('cdn.platinumlist.net/upload/event')) urls.push(normalizeUrl(url));
    }
  }
  return unique(urls);
}

export function chooseBestImageUrl(imageUrls = []) {
  const urls = unique(imageUrls);
  const cleanRaster = urls.filter((url) => /\.(jpg|jpeg|png)$/i.test(url));
  const cleanFull = cleanRaster.find((url) => /[-_]full[-_]/i.test(url));
  if (cleanFull) return cleanFull;
  const anyFull = urls.find((url) => /[-_]full[-_]/i.test(url));
  if (anyFull) return anyFull;
  return cleanRaster[0] || urls[0] || '';
}

function extractBetween(block, regex) {
  const match = block.match(regex);
  return match ? stripTags(match[1]) : '';
}

export function parsePlatinumlistHtml(html, context = {}) {
  const source = context.source || {};
  const cityInfo = inferCityFromPath(context.filePath || source.id || source.url || '');
  const parts = String(html).split(/<div class="event-grid-item">/);
  const leads = [];

  for (const part of parts.slice(1)) {
    const block = `<div class="event-grid-item">${part}`;
    const hrefMatch = block.match(/href="([^"]*\/event-tickets\/[^"]+)"/i);
    const href = hrefMatch ? normalizeUrl(hrefMatch[1]) : '';
    if (!href) continue;

    const titleFromAnchor = extractBetween(block, /<a[^>]*class="[^"]*event-grid-item__title[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    const titleFromImg = extractAttribute(block, 'alt') || extractAttribute(block, 'title');
    const title = titleFromAnchor || titleFromImg;
    if (!title) continue;

    const date_text = extractBetween(block, /<span[^>]*class="[^"]*\bdate\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const prices = unique([...block.matchAll(/<span[^>]*class="[^"]*\bprice\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)].map((match) => stripTags(match[1])));
    const labels = unique([...block.matchAll(/<span[^>]*class="[^"]*image-label__text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)].map((match) => stripTags(match[1])));
    const urgency = extractBetween(block, /<div[^>]*class="[^"]*event-grid-item__accelerator[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const id = extractAttribute(block, 'data-favorite-id');
    const image_urls = unique([
      ...extractAllAttributeUrls(block, 'srcset'),
      ...extractAllAttributeUrls(block, 'data-srcset'),
      ...extractAllAttributeUrls(block, 'src'),
      ...extractAllAttributeUrls(block, 'data-src')
    ]);

    leads.push({
      source_id: source.id || context.sourceId || 'platinumlist-snapshot',
      source_url: source.url || context.sourceUrl || '',
      source_final_url: source.final_url || '',
      source_snapshot: context.filePath || '',
      source_screenshot: context.screenshotPath || '',
      source_policy: PLATINUMLIST_SOURCE_POLICY.intake_policy,
      external_id: id,
      title,
      url: href,
      city: cityInfo.city,
      city_ar: cityInfo.city_ar,
      date_text,
      price_text: prices.join(' | '),
      labels,
      urgency,
      image_urls,
      best_image_url: chooseBestImageUrl(image_urls),
      evidence_level: 'marketplace-rendered-card',
      publishable_without_secondary_verification: false
    });
  }

  const byUrl = new Map();
  for (const lead of leads) {
    const existing = byUrl.get(lead.url);
    if (!existing || lead.image_urls.length > existing.image_urls.length) byUrl.set(lead.url, lead);
  }
  return [...byUrl.values()].sort((a, b) => a.city.localeCompare(b.city) || a.title.localeCompare(b.title));
}

export function parsePlatinumlistEventLinks(html, context = {}) {
  const source = context.source || {};
  const cityInfo = inferCityFromPath(context.filePath || source.id || source.url || '');
  const sourceId = source.id || context.sourceId || inferSourceIdFromPath(context.filePath || '');
  const links = [];
  const anchorRegex = /<a\b[^>]*href="([^"]*\/event-tickets\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of String(html).matchAll(anchorRegex)) {
    const url = normalizeUrl(match[1]);
    if (!url) continue;
    const text = stripTags(match[2]);
    const slugTitle = decodeURIComponent(url.split('/').filter(Boolean).pop() || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    links.push({
      source_id: sourceId,
      source_url: source.url || context.sourceUrl || '',
      source_final_url: source.final_url || '',
      source_snapshot: context.filePath || '',
      source_policy: PLATINUMLIST_SOURCE_POLICY.intake_policy,
      title: text || slugTitle,
      url,
      city: cityInfo.city,
      city_ar: cityInfo.city_ar,
      evidence_level: text ? 'marketplace-rendered-link' : 'marketplace-rendered-link-slug',
      publishable_without_secondary_verification: false
    });
  }

  const byUrl = new Map();
  for (const link of links) {
    const existing = byUrl.get(link.url);
    if (!existing || (link.title && link.title.length > existing.title.length)) byUrl.set(link.url, link);
  }
  return [...byUrl.values()].sort((a, b) => a.city.localeCompare(b.city) || a.title.localeCompare(b.title));
}

function loadBrowserProbeSources() {
  if (!fs.existsSync(browserProbeReportPath)) return new Map();
  const report = JSON.parse(fs.readFileSync(browserProbeReportPath, 'utf8'));
  const sources = new Map();
  for (const source of report.sources || []) {
    if (source.raw_html_path) sources.set(path.resolve(rootDir, source.raw_html_path), source);
  }
  return sources;
}

function listSnapshotFiles() {
  if (!fs.existsSync(rawDir)) return [];
  return fs.readdirSync(rawDir)
    .filter((file) => /^platinumlist-.*\.html$/i.test(file))
    .map((file) => path.join(rawDir, file))
    .sort();
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Platinumlist Snapshot Lead Report');
  lines.push('');
  lines.push(`Generated at: ${report.generated_at}`);
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push(`- Intake policy: ${report.policy.intake_policy}`);
  lines.push(`- Publication rule: ${report.policy.publication_rule}`);
  lines.push(`- Allowed use: ${report.policy.allowed_use}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Snapshots scanned: ${report.totals.snapshots_scanned}`);
  lines.push(`- Rich card leads: ${report.totals.rich_card_leads}`);
  lines.push(`- Link-only discovery leads: ${report.totals.link_only_leads}`);
  lines.push(`- Total unique event URLs: ${report.totals.total_unique_event_urls}`);
  lines.push(`- Rich leads with high-resolution image URL: ${report.totals.with_best_image}`);
  lines.push(`- Cities: ${Object.keys(report.by_city).length}`);
  lines.push('');
  lines.push('| City | Rich leads | Link-only | With image |');
  lines.push('|---|---:|---:|---:|');
  for (const [city, stats] of Object.entries(report.by_city)) {
    lines.push(`| ${city} | ${stats.rich_card_leads} | ${stats.link_only_leads} | ${stats.with_best_image} |`);
  }
  lines.push('');
  lines.push('## Top Leads');
  lines.push('');
  lines.push('| City | Title | Date text | Price | Image | URL |');
  lines.push('|---|---|---|---|---|---|');
  for (const lead of report.leads.slice(0, 40)) {
    lines.push(`| ${lead.city_ar} | ${lead.title.replace(/\|/g, '/')} | ${lead.date_text.replace(/\|/g, '/')} | ${lead.price_text.replace(/\|/g, '/')} | ${lead.best_image_url ? 'yes' : 'no'} | ${lead.url} |`);
  }
  lines.push('');
  lines.push('## Link-Only Discovery Leads');
  lines.push('');
  lines.push('| City | Title | URL |');
  lines.push('|---|---|---|');
  for (const lead of report.link_only_leads.slice(0, 80)) {
    lines.push(`| ${lead.city_ar} | ${lead.title.replace(/\|/g, '/')} | ${lead.url} |`);
  }
  lines.push('');
  lines.push('## Next Operating Move');
  lines.push('');
  lines.push('1. Use these leads as discovery evidence only.');
  lines.push('2. Match each high-value event against organizer, venue, or official source pages.');
  lines.push('3. Promote only candidates that pass EventLive trust and completeness gates.');
  lines.push('4. Re-run browser probe before this script to refresh snapshots when access is available.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

export function buildPlatinumlistSnapshotLeadReport() {
  const sourceBySnapshot = loadBrowserProbeSources();
  const files = listSnapshotFiles();
  const allLeads = [];
  const snapshotSummaries = [];

  for (const filePath of files) {
    const html = fs.readFileSync(filePath, 'utf8');
    const source = sourceBySnapshot.get(path.resolve(filePath)) || {};
    const context = {
      filePath,
      source,
      screenshotPath: filePath.replace(/\.html$/i, '.png')
    };
    const leads = parsePlatinumlistHtml(html, context);
    const eventLinks = parsePlatinumlistEventLinks(html, context);
    snapshotSummaries.push({
      snapshot: path.relative(rootDir, filePath),
      source_id: source.id || inferSourceIdFromPath(filePath),
      final_url: source.final_url || '',
      rich_card_leads: leads.length,
      event_links: eventLinks.length
    });
    allLeads.push(...leads);
    for (const link of eventLinks) allLeads.push({ ...link, link_only_candidate: true });
  }

  const richByUrl = new Map();
  const linkByUrl = new Map();
  for (const lead of allLeads) {
    if (lead.link_only_candidate) {
      const existing = linkByUrl.get(lead.url);
      if (!existing || lead.source_snapshot > existing.source_snapshot) linkByUrl.set(lead.url, lead);
    } else {
      const existing = richByUrl.get(lead.url);
      if (!existing || lead.source_snapshot > existing.source_snapshot) richByUrl.set(lead.url, lead);
    }
  }
  const leads = [...richByUrl.values()].sort((a, b) => a.city.localeCompare(b.city) || a.title.localeCompare(b.title));
  const link_only_leads = [...linkByUrl.values()]
    .filter((lead) => !richByUrl.has(lead.url))
    .map(({ link_only_candidate, ...lead }) => lead)
    .sort((a, b) => a.city.localeCompare(b.city) || a.title.localeCompare(b.title));

  const by_city = {};
  for (const lead of leads) {
    by_city[lead.city_ar] ||= { rich_card_leads: 0, link_only_leads: 0, with_best_image: 0 };
    by_city[lead.city_ar].rich_card_leads += 1;
    if (lead.best_image_url) by_city[lead.city_ar].with_best_image += 1;
  }
  for (const lead of link_only_leads) {
    by_city[lead.city_ar] ||= { rich_card_leads: 0, link_only_leads: 0, with_best_image: 0 };
    by_city[lead.city_ar].link_only_leads += 1;
  }

  return {
    generated_at: new Date().toISOString(),
    policy: PLATINUMLIST_SOURCE_POLICY,
    totals: {
      snapshots_scanned: files.length,
      rich_card_leads: leads.length,
      link_only_leads: link_only_leads.length,
      total_unique_event_urls: leads.length + link_only_leads.length,
      with_best_image: leads.filter((lead) => lead.best_image_url).length
    },
    snapshots: snapshotSummaries,
    by_city,
    leads,
    link_only_leads
  };
}

function main() {
  fs.mkdirSync(reportsDir, { recursive: true });
  const report = buildPlatinumlistSnapshotLeadReport();
  fs.writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdReportPath, renderMarkdown(report));
  console.log(`# Platinumlist snapshot leads`);
  console.log(`- snapshots: ${report.totals.snapshots_scanned}`);
  console.log(`- rich_card_leads: ${report.totals.rich_card_leads}`);
  console.log(`- link_only_leads: ${report.totals.link_only_leads}`);
  console.log(`- total_unique_event_urls: ${report.totals.total_unique_event_urls}`);
  console.log(`- with_best_image: ${report.totals.with_best_image}`);
  console.log(`- report: ${path.relative(rootDir, mdReportPath)}`);
}

if (process.argv[1] === __filename) {
  main();
}
