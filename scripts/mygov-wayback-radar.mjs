import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');
const rawDir = path.join(rootDir, 'data', 'raw', 'mygov-wayback-radar');
const jsonReportPath = path.join(reportsDir, 'mygov-wayback-radar.json');
const mdReportPath = path.join(reportsDir, 'mygov-wayback-radar.md');

const generatedAt = new Date().toISOString();
const limitPerLang = Math.max(1, Number(process.env.EVENTLIVE_MYGOV_WAYBACK_LIMIT || 20));
const fetchLimit = Math.max(limitPerLang, Number(process.env.EVENTLIVE_MYGOV_WAYBACK_CDX_LIMIT || 100));
const timeoutMs = Math.max(5000, Number(process.env.EVENTLIVE_MYGOV_WAYBACK_TIMEOUT_MS || 25000));

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeWhitespace(value = '') {
  return decodeHtml(value).replace(/\s+/g, ' ').trim();
}

function decodeNextPayload(html = '') {
  return String(html)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/');
}

function extractArrayBlock(text = '', fieldName = '') {
  const marker = `"${fieldName}":[`;
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return '';
  const start = text.indexOf('[', markerIndex);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') inString = !inString;
    if (inString) continue;
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return '';
}

function propFromBlock(block = '', propName = '') {
  const quoted = block.match(new RegExp(`"${propName}"\\s*:\\s*"([^"]*)"`));
  if (quoted) return normalizeWhitespace(quoted[1]);
  const numeric = block.match(new RegExp(`"${propName}"\\s*:\\s*(\\d+)`));
  return numeric?.[1] || '';
}

function valuesFromBlock(block = '', propName = '') {
  return [...block.matchAll(new RegExp(`"${propName}"\\s*:\\s*(?:"([^"]*)"|(\\d+))`, 'g'))]
    .map((match) => normalizeWhitespace(match[1] || match[2] || ''))
    .filter(Boolean);
}

function extractStructuredFields(html = '') {
  const payload = decodeNextPayload(html);
  const block = (fieldName) => extractArrayBlock(payload, fieldName);
  const titleBlock = block('title');
  const dateBlock = block('field_ne_event_date');
  const typeBlock = block('field_ne_event_type');
  const organizerBlock = block('field_ne_organizer_name');
  const websiteBlock = block('field_ne_event_website');
  const coverBlock = block('field_ne_cover_photo');
  const feedsBlock = block('feeds_item');
  const nid = propFromBlock(block('nid'), 'value');
  const uuid = propFromBlock(block('uuid'), 'value');
  const start = propFromBlock(dateBlock, 'value');
  const end = propFromBlock(dateBlock, 'end_value');

  const fields = {
    drupal_nid: nid,
    drupal_uuid: uuid,
    feeds_item_ids: valuesFromBlock(feedsBlock, 'target_id'),
    feeds_item_labels: valuesFromBlock(feedsBlock, 'label'),
    feeds_item_urls: valuesFromBlock(feedsBlock, 'url'),
    feeds_id: propFromBlock(block('field_feeds_id'), 'value'),
    title: propFromBlock(titleBlock, 'value'),
    category: propFromBlock(typeBlock, 'label'),
    category_url: propFromBlock(typeBlock, 'url'),
    organizer: propFromBlock(organizerBlock, 'value'),
    event_website_url: propFromBlock(websiteBlock, 'uri'),
    event_website_title: propFromBlock(websiteBlock, 'title'),
    cover_image_url: propFromBlock(coverBlock, 'url'),
    cover_image_card_url: propFromBlock(coverBlock, 'url_event_organizer_card'),
    event_city: propFromBlock(block('field_ne_event_city'), 'label'),
    event_region: propFromBlock(block('field_ne_event_region'), 'label'),
    event_site: propFromBlock(block('field_ne_event_site'), 'value'),
    google_maps: propFromBlock(block('field_ne_google_maps'), 'uri'),
    organizer_email: propFromBlock(block('field_ne_organizer_mail'), 'value'),
    organizer_website: propFromBlock(block('field_ne_organizer_website'), 'uri'),
    event_email: propFromBlock(block('field_ne_event_email'), 'value'),
    phone: propFromBlock(block('field_ne_phone'), 'value'),
    year: propFromBlock(block('field_ne_year'), 'value'),
    starts_at: start,
    ends_at: end
  };

  return Object.fromEntries(Object.entries(fields).filter(([, value]) => Array.isArray(value) ? value.length : Boolean(value)));
}

function stripHtmlToLines(html = '') {
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

function titleFromHtml(html = '') {
  const match = String(html).match(/<title[^>]*>(.*?)<\/title>/is);
  return normalizeWhitespace(match?.[1] || '');
}

function eventIdFromUrl(url = '') {
  return String(url).match(/\/events\/(\d+)/)?.[1] || '';
}

function langFromUrl(url = '') {
  return String(url).match(/my\.gov\.sa\/(ar|en)\//)?.[1] || 'unknown';
}

function lineAfter(lines, labels = []) {
  for (const label of labels) {
    const idx = lines.findIndex((line) => line === label || line.startsWith(`${label} :`) || line.startsWith(`${label}:`));
    if (idx >= 0) {
      const inline = lines[idx].replace(label, '').replace(/^[:：\s-]+/, '').trim();
      if (inline && inline !== label) return inline;
      for (const next of lines.slice(idx + 1, idx + 5)) {
        if (next && !labels.includes(next) && !/^(Image|Share|مشاركة|التسجيل|Register)/i.test(next)) return next;
      }
    }
  }
  return '';
}

function lineBefore(lines, labels = []) {
  for (const label of labels) {
    const idx = lines.findIndex((line) => line === label || line.startsWith(`${label} :`) || line.startsWith(`${label}:`));
    if (idx > 0) {
      for (const previous of lines.slice(Math.max(0, idx - 4), idx).reverse()) {
        if (previous && !labels.includes(previous) && !/^(Image|Share|مشاركة|التسجيل|Register|Email|Phone|البريد الإلكتروني|الهاتف)$/i.test(previous)) return previous;
      }
    }
  }
  return '';
}

function lineMatching(lines, regex) {
  return lines.find((line) => regex.test(line)) || '';
}

function titleFromLines(lines, lang) {
  const home = lang === 'ar' ? 'الرئيسية' : 'Home';
  const events = lang === 'ar' ? 'الفعاليات' : 'Events';
  const blacklist = new Set([
    'Home',
    'Events',
    'الفعاليات',
    'الرئيسية',
    '/',
    'Loading, please wait...',
    'جاري التحميل، يرجى الانتظار...'
  ]);
  const breadcrumbIndexes = [];
  for (let i = 0; i < lines.length - 2; i += 1) {
    if (lines[i] === home && lines[i + 1] === events) breadcrumbIndexes.push(i + 1);
    if (lines[i] === home && lines[i + 1] === '/' && lines[i + 2] === events) breadcrumbIndexes.push(i + 2);
  }
  const indexes = breadcrumbIndexes.length
    ? breadcrumbIndexes.reverse()
    : lines.map((line, index) => (line === events ? index : -1)).filter((index) => index >= 0).reverse();
  for (const idx of indexes) {
    for (const line of lines.slice(idx + 1, idx + 8)) {
      if (line && !blacklist.has(line) && !/^Image\b/i.test(line)) return line;
    }
  }
  return '';
}

function categoryFromLines(lines, title, lang) {
  const idx = lines.findIndex((line) => line === title);
  if (idx >= 0) {
    const next = lines[idx + 1] || '';
    if (next && !/(Organizer|Email|Phone|المنظم|البريد|الهاتف)/i.test(next)) return next;
  }
  const categoryPattern = lang === 'ar'
    ? /(فعاليات|ثقافية|ترفيه|سياحة|اقتصادية|تقنية|علمية|المشاركة الإلكترونية)/
    : /(Events|Cultural|Entertainment|Tourism|Economic|IT|Scientific|e-Participation)/i;
  return lineMatching(lines, categoryPattern);
}

function parseDateRange(value = '') {
  const match = normalizeWhitespace(value).match(/(20\d{2}-\d{2}-\d{2})\s*-\s*(20\d{2}-\d{2}-\d{2})/);
  if (!match) return { starts_at: '', ends_at: '', date_complete: false };
  return { starts_at: match[1], ends_at: match[2], date_complete: true };
}

function parseMgovEvent({ html = '', url = '', timestamp = '' }) {
  const lines = stripHtmlToLines(html);
  const structured = extractStructuredFields(html);
  const lang = langFromUrl(url);
  const htmlTitle = titleFromHtml(html);
  const title = structured.title || titleFromLines(lines, lang) || htmlTitle.replace(/\s*\|\s*(National Platform|المنصة الوطنية).*$/i, '');
  const dateLabel = lang === 'ar' ? ['تاريخ الفعالية'] : ['Event Date'];
  const locationLabel = lang === 'ar' ? ['الموقع'] : ['Locations', 'Location'];
  const organizerLabel = lang === 'ar' ? ['المنظم'] : ['Organizer'];
  const emailLabel = lang === 'ar' ? ['البريد الإلكتروني'] : ['Email'];
  const phoneLabel = lang === 'ar' ? ['الهاتف'] : ['Phone'];
  const dateText = lineAfter(lines, dateLabel);
  const dates = structured.starts_at && structured.ends_at
    ? { starts_at: structured.starts_at, ends_at: structured.ends_at, date_complete: true }
    : parseDateRange(dateText);
  const locationLine = lineAfter(lines, locationLabel);
  const organizer = structured.organizer || lineBefore(lines, organizerLabel) || lineAfter(lines, organizerLabel);
  const email = structured.event_email || structured.organizer_email || lineAfter(lines, emailLabel);
  const phone = structured.phone || lineAfter(lines, phoneLabel);
  const category = structured.category || categoryFromLines(lines, title, lang);
  const titleIndex = lines.findIndex((line) => line === title);
  const dateIndex = lines.findIndex((line) => line === dateText);
  const description = titleIndex >= 0 && dateIndex >= 0
    ? lines.slice(dateIndex + 1, dateIndex + 7).filter((line) => !/^(Participate|Share|Register|مشاركة|التسجيل)/i.test(line)).join(' ').slice(0, 900)
    : '';

  return {
    source_id: 'my-gov-sa-events',
    evidence_level: 'wayback-archived-page',
    publishable_without_secondary_verification: false,
    event_id: eventIdFromUrl(url),
    lang,
    original_url: url,
    wayback_timestamp: timestamp,
    wayback_url: `https://web.archive.org/web/${timestamp}id_/${url}`,
    platform_model: 'Next.js front end with embedded Drupal/Feeds event payload',
    drupal_nid: structured.drupal_nid || '',
    drupal_uuid: structured.drupal_uuid || '',
    feeds_id: structured.feeds_id || '',
    feeds_item_ids: structured.feeds_item_ids || [],
    feeds_item_labels: structured.feeds_item_labels || [],
    title,
    category,
    organizer,
    email,
    phone,
    location_label: structured.event_city || structured.event_region || structured.event_site || locationLine,
    event_website_url: structured.event_website_url || '',
    event_website_title: structured.event_website_title || '',
    cover_image_url: structured.cover_image_url || '',
    google_maps: structured.google_maps || '',
    date_text: structured.starts_at && structured.ends_at ? `${structured.starts_at} - ${structured.ends_at}` : dateText,
    ...dates,
    description
  };
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'EventLive Source Recon/1.0 (+manual review; archive evidence)'
      }
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

async function cdxRows(lang) {
  const params = new URLSearchParams({
    url: `my.gov.sa/${lang}/events/*`,
    from: '202501',
    to: '202607',
    output: 'json',
    fl: 'timestamp,original,statuscode,mimetype,digest',
    collapse: 'urlkey',
    limit: String(fetchLimit)
  });
  params.append('filter', 'statuscode:200');
  params.append('filter', 'mimetype:text/html');
  const url = `https://web.archive.org/cdx?${params.toString()}`;
  const result = await fetchWithTimeout(url);
  if (!result.ok) return [];
  const parsed = JSON.parse(result.text);
  return parsed.slice(1).map(([timestamp, original, statuscode, mimetype, digest]) => ({
    timestamp,
    original,
    statuscode,
    mimetype,
    digest
  }));
}

function rowRank(row) {
  const url = row.original || '';
  let score = 0;
  if (/\/events\/\d+$/.test(url)) score += 4;
  if (/\/en\//.test(url)) score += 1;
  if (!/[?&]highlight=/.test(url)) score += 1;
  return score;
}

async function main() {
  ensureDir(reportsDir);
  ensureDir(rawDir);

  const rows = [];
  for (const lang of ['ar', 'en']) rows.push(...await cdxRows(lang));
  const byUrl = new Map();
  for (const row of rows.sort((a, b) => rowRank(b) - rowRank(a) || String(b.timestamp).localeCompare(String(a.timestamp)))) {
    const cleanUrl = String(row.original || '').replace(/\?.*$/, '');
    if (!/\/events\/\d+$/.test(cleanUrl)) continue;
    if (!byUrl.has(cleanUrl)) byUrl.set(cleanUrl, { ...row, original: cleanUrl });
    if (byUrl.size >= limitPerLang * 2) break;
  }

  const captures = [...byUrl.values()].slice(0, limitPerLang * 2);
  const events = [];
  const failures = [];
  for (const capture of captures) {
    const archiveUrl = `https://web.archive.org/web/${capture.timestamp}id_/${capture.original}`;
    try {
      const result = await fetchWithTimeout(archiveUrl);
      if (!result.ok) {
        failures.push({ capture, status: result.status });
        continue;
      }
      const rawPath = path.join(rawDir, `${capture.timestamp}-${eventIdFromUrl(capture.original)}-${langFromUrl(capture.original)}.html`);
      fs.writeFileSync(rawPath, result.text, 'utf8');
      events.push({ ...parseMgovEvent({ html: result.text, url: capture.original, timestamp: capture.timestamp }), raw_snapshot: path.relative(rootDir, rawPath) });
    } catch (error) {
      failures.push({ capture, error: error.message });
    }
  }

  const dateComplete = events.filter((event) => event.date_complete);
  const report = {
    schema: 'eventlive.mygov-wayback-radar.v1',
    generated_at: generatedAt,
    policy: {
      source: 'Wayback Machine archived GOV.SA event pages',
      allowed_use: 'parser lab, source evidence, secondary verification, lead discovery',
      disallowed_use: 'direct auto-publication without current official confirmation',
      publication_gate: 'source-evidence'
    },
    totals: {
      cdx_rows: rows.length,
      captures_attempted: captures.length,
      events_extracted: events.length,
      date_complete: dateComplete.length,
      structured_payloads: events.filter((event) => event.drupal_nid || event.drupal_uuid).length,
      failures: failures.length
    },
    events,
    failures
  };

  fs.writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdReportPath, renderMarkdown(report), 'utf8');

  console.log('# GOV.SA Wayback Radar');
  console.log(`- Captures attempted: ${report.totals.captures_attempted}`);
  console.log(`- Events extracted: ${report.totals.events_extracted}`);
  console.log(`- Date-complete: ${report.totals.date_complete}`);
  console.log(`- Report: ${path.relative(rootDir, mdReportPath)}`);
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\n/g, ' ').replace(/\|/g, '\\|')).join(' | ')} |`)
  ].join('\n');
}

function renderMarkdown(report) {
  const rows = report.events.map((event) => [
    event.event_id,
    event.lang,
    event.title,
    event.starts_at && event.ends_at ? `${event.starts_at} - ${event.ends_at}` : event.date_text || '-',
    event.organizer || '-',
    event.location_label || '-',
    event.wayback_url
  ]);
  return [
    '# GOV.SA Wayback Radar',
    '',
    `Generated at: ${report.generated_at}`,
    '',
    '## Policy',
    '',
    '- Use as parser lab, source evidence, secondary verification, and lead discovery.',
    '- Do not auto-publish from archived pages without current official confirmation.',
    '- Publication gate: `source-evidence`.',
    '',
    '## Totals',
    '',
    `- CDX rows: ${report.totals.cdx_rows}`,
    `- Captures attempted: ${report.totals.captures_attempted}`,
    `- Events extracted: ${report.totals.events_extracted}`,
    `- Date-complete: ${report.totals.date_complete}`,
    `- Structured payloads: ${report.totals.structured_payloads}`,
    `- Failures: ${report.totals.failures}`,
    '',
    '## Extracted Archive Evidence',
    '',
    rows.length ? mdTable(['ID', 'Lang', 'Title', 'Date', 'Organizer', 'Location', 'Wayback URL'], rows) : '_No events extracted._',
    ''
  ].join('\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
