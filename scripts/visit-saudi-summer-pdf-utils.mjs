import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ARABIC_MONTHS = new Map([
  ['يناير', 0],
  ['فبراير', 1],
  ['مارس', 2],
  ['أبريل', 3],
  ['ابريل', 3],
  ['مايو', 4],
  ['يونيو', 5],
  ['يوليو', 6],
  ['أغسطس', 7],
  ['اغسطس', 7],
  ['سبتمبر', 8],
  ['أكتوبر', 9],
  ['اكتوبر', 9],
  ['نوفمبر', 10],
  ['ديسمبر', 11]
]);

const PAGE_DESTINATIONS_2026 = [
  { from: 4, to: 19, city: 'Aseer', venue: 'منطقة عسير' },
  { from: 21, to: 28, city: 'Saudi Arabia', venue: 'وجهة البحر الأحمر' },
  { from: 30, to: 45, city: 'Jeddah', venue: 'جدة' },
  { from: 47, to: 63, city: 'Riyadh', venue: 'الرياض' },
  { from: 65, to: 70, city: 'Al Baha', venue: 'الباحة' },
  { from: 72, to: 79, city: 'Taif', venue: 'الطائف' },
  { from: 81, to: 84, city: 'AlUla', venue: 'العلا' }
];

function decodeXml(value = '') {
  return String(value)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/�/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDigits(value = '') {
  return String(value)
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function cleanVisitSaudiText(value = '') {
  return String(value)
    .replace(/(^|\s)اا(?=[\u0600-\u06ff])/g, '$1الأ')
    .replace(/(^|\s)ا(?=\s|$)/g, '$1في')
    .replace(/(^|\s)إا(?=\s|$)/g, '$1إلى')
    .replace(/(^|\s)عا(?=\s|$)/g, '$1على')
    .replace(/(^|\s)خا(?=\s|$)/g, '$1خلال')
    .replace(/6202/g, '2026')
    .replace(/الثاثاء/g, 'الثلاثاء')
    .replace(/حفات/g, 'حفلات')
    .replace(/مأكوات/g, 'مأكولات')
    .replace(/المأكوات/g, 'المأكولات')
    .replace(/شتات/g, 'شتلات')
    .replace(/صاات/g, 'صالات')
    .replace(/عماقة/g, 'عملاقة')
    .replace(/ماعب/g, 'ملاعب')
    .replace(/عامات/g, 'علامات')
    .replace(/جوات/g, 'جولات')
    .replace(/سعوداين/g, 'سعوديين')
    .replace(/انطاق/g, 'انطلاق')
    .replace(/فصاً/g, 'فصلاً')
    .replace(/احتفااً/g, 'احتفالاً')
    .replace(/الأثارة/g, 'الإثارة')
    .replace(/الأيقاعات/g, 'الإيقاعات')
    .replace(/الأبداع/g, 'الإبداع')
    .replace(/الألكترونية/g, 'الإلكترونية')
    .replace(/ايس كريم/g, 'آيس كريم')
    .replace(/\)([^()]+)\(/g, '($1)')
    .replace(/\s+/g, ' ')
    .trim();
}

export function restoreVisitSaudiPdfText(value = '') {
  const text = decodeXml(value);
  if (!/[\u0600-\u06ff]/.test(text)) return text;
  const tokens = text.split(/\s+/).filter(Boolean);
  const groups = [];
  for (const token of tokens) {
    const isLatin = /[A-Za-z]/.test(token);
    const previous = groups.at(-1);
    if (!previous || previous.isLatin !== isLatin) groups.push({ isLatin, tokens: [token] });
    else previous.tokens.push(token);
  }
  const restored = groups.reverse().map((group) => {
    if (group.isLatin) return group.tokens.join(' ');
    return [...group.tokens].reverse().map((token) => (
      /[\u0600-\u06ff]/.test(token) ? Array.from(token).reverse().join('') : token
    )).join(' ');
  }).join(' ');
  return cleanVisitSaudiText(restored);
}

function destinationForPage(pageNumber, year) {
  if (year !== 2026) return null;
  return PAGE_DESTINATIONS_2026.find((range) => pageNumber >= range.from && pageNumber <= range.to) || null;
}

function parseDateRange(value = '', year) {
  const text = normalizeDigits(value).replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  if (/نهاية الصيف|قريبا/.test(text)) return null;
  const monthPattern = [...ARABIC_MONTHS.keys()].sort((a, b) => b.length - a.length).join('|');
  const match = text.match(new RegExp(`(\\d{1,2})\\s+(${monthPattern})(?:\\s*-\\s*(\\d{1,2})\\s+(${monthPattern}))?`));
  if (!match) return null;
  const startDay = Number(match[1]);
  const startMonth = ARABIC_MONTHS.get(match[2]);
  const endDay = Number(match[3] || match[1]);
  const endMonth = ARABIC_MONTHS.get(match[4] || match[2]);
  const endYear = endMonth < startMonth ? year + 1 : year;
  const validDate = (y, month, day) => {
    const date = new Date(Date.UTC(y, month, day));
    return date.getUTCFullYear() === y && date.getUTCMonth() === month && date.getUTCDate() === day;
  };
  if (!validDate(year, startMonth, startDay) || !validDate(endYear, endMonth, endDay)) return null;
  const datePart = (y, month, day) => `${y}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    starts_at: `${datePart(year, startMonth, startDay)}T00:00:00+03:00`,
    ends_at: `${datePart(endYear, endMonth, endDay)}T23:59:00+03:00`,
    raw_date_text: text
  };
}

function inferCategory(title = '', summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  if (/كأس العالم|مباراة|fan zone|pfl|رياض/.test(text)) return 'sports';
  if (/حفل|موسيق|غنائي|concert|كوميدي/.test(text)) return 'entertainment';
  if (/معرض|متحف|فنون|ثقاف|كتاب/.test(text)) return 'culture and arts';
  if (/مهرجان|سوق|تسوق/.test(text)) return 'festival';
  if (/مغامر|تسلق|هايكنج|غوص|كاياك/.test(text)) return 'outdoor experience';
  return 'tourism experience';
}

function linesForLink(nodes) {
  const rows = [];
  for (const node of [...nodes].sort((a, b) => a.top - b.top || a.left - b.left)) {
    let row = rows.find((candidate) => Math.abs(candidate.top - node.top) <= 2);
    if (!row) {
      row = { top: node.top, nodes: [] };
      rows.push(row);
    }
    row.nodes.push(node);
  }
  return rows.sort((a, b) => a.top - b.top).map((row) => {
    const ordered = row.nodes.sort((a, b) => a.left - b.left);
    return {
      top: row.top,
      size: Math.max(...ordered.map((node) => node.size || 0)),
      bold: ordered.some((node) => node.bold),
      text: restoreVisitSaudiPdfText(ordered.map((node) => node.raw).join(' '))
    };
  }).filter((line) => line.text);
}

function isUtilityLine(text = '') {
  const normalized = text.replace(/[\u064b-\u065f\u0670]/g, '');
  return /^(احجز\s+ا.*ن|اكسب|واستبدل|النقاط|مع|قريبا|للرجوع للصفحة الرئيسية)$/i.test(normalized)
    || /مكافآت السعودية|أضعاف النقاط/.test(normalized);
}

function parseAttributes(value = '') {
  const attributes = {};
  for (const match of value.matchAll(/([\w:-]+)="([^"]*)"/g)) attributes[match[1]] = decodeXml(match[2]);
  return attributes;
}

function cardKeyForPosition(top, left) {
  return `${top < 1050 ? 'top' : 'bottom'}-${left < 810 ? 'left' : 'right'}`;
}

function explicitDatedCardKeys(xml = '', year) {
  const keys = new Set();
  for (const pageMatch of xml.matchAll(/<page\s+([^>]*)>([\s\S]*?)<\/page>/g)) {
    const pageNumber = Number(parseAttributes(pageMatch[1]).number || 0);
    if (!destinationForPage(pageNumber, year)) continue;
    const cards = new Map();
    for (const textMatch of pageMatch[2].matchAll(/<text\s+([^>]*)>([\s\S]*?)<\/text>/g)) {
      const attributes = parseAttributes(textMatch[1]);
      const top = Number(attributes.top || 0);
      if (top < 250) continue;
      const cardKey = cardKeyForPosition(top, Number(attributes.left || 0));
      const nodes = cards.get(cardKey) || [];
      nodes.push({
        raw: decodeXml(textMatch[2]),
        top,
        left: Number(attributes.left || 0),
        size: 0,
        bold: false
      });
      cards.set(cardKey, nodes);
    }
    for (const [cardKey, nodes] of cards) {
      if (linesForLink(nodes).some((line) => parseDateRange(line.text, year))) {
        keys.add(`${pageNumber}|${cardKey}`);
      }
    }
  }
  return keys;
}

function attachDatedCardImages(xml = '', year, options = {}) {
  const outputDir = options.imageOutputDir;
  if (!outputDir) return xml.replace(/<image\s+[^>]*\/>/g, '');
  const publicBasePath = String(options.publicBasePath || '/assets/event-images').replace(/\/$/, '');
  const datedKeys = explicitDatedCardKeys(xml, year);
  fs.mkdirSync(outputDir, { recursive: true });
  return xml.replace(/<page\s+([^>]*)>([\s\S]*?)<\/page>/g, (pageXml, pageAttrs, pageBody) => {
    const pageNumber = Number(parseAttributes(pageAttrs).number || 0);
    const bestByCard = new Map();
    for (const imageMatch of pageBody.matchAll(/<image\s+([^>]*)\/>/g)) {
      const attributes = parseAttributes(imageMatch[1]);
      const top = Number(attributes.top || 0);
      const left = Number(attributes.left || 0);
      const width = Number(attributes.width || 0);
      const height = Number(attributes.height || 0);
      const cardKey = cardKeyForPosition(top, left);
      const acceptedKey = `${pageNumber}|${cardKey}`;
      if (!datedKeys.has(acceptedKey) || width < 300 || height < 150 || !attributes.src) continue;
      const area = width * height;
      if (!bestByCard.has(cardKey) || bestByCard.get(cardKey).area < area) {
        bestByCard.set(cardKey, { area, src: attributes.src });
      }
    }
    const markers = [];
    for (const [cardKey, image] of bestByCard) {
      const sourceExtension = path.extname(image.src).toLowerCase();
      const extension = ['.jpg', '.jpeg', '.png'].includes(sourceExtension) ? sourceExtension.replace('.jpeg', '.jpg') : '.jpg';
      const filename = `visit-saudi-summer-${year}-p${String(pageNumber).padStart(3, '0')}-${cardKey}${extension}`;
      const outputPath = path.join(outputDir, filename);
      fs.copyFileSync(image.src, outputPath);
      markers.push(`<eventlive-card-image card="${cardKey}" src="${publicBasePath}/${filename}"/>`);
    }
    const cleanBody = pageBody.replace(/<image\s+[^>]*\/>/g, '');
    return `<page ${pageAttrs}>${markers.join('\n')}${cleanBody}</page>`;
  });
}

export function parseVisitSaudiSummerPdfXml(xml = '', source = {}) {
  const year = Number(xml.match(/<eventlive-pdf-meta\s+year="(20\d{2})"/)?.[1] || 0);
  if (!year) return [];
  const items = [];
  const globalFontSizes = new Map([...xml.matchAll(/<fontspec\s+([^>]*)\/>/g)].map((match) => {
    const attributes = parseAttributes(match[1]);
    return [attributes.id, Number(attributes.size || 0)];
  }));
  for (const pageMatch of xml.matchAll(/<page\s+([^>]*)>([\s\S]*?)<\/page>/g)) {
    const pageAttributes = parseAttributes(pageMatch[1]);
    const pageNumber = Number(pageAttributes.number || 0);
    const destination = destinationForPage(pageNumber, year);
    if (!destination) continue;
    const cards = new Map();
    const cardImages = new Map([...pageMatch[2].matchAll(/<eventlive-card-image\s+([^>]*)\/>/g)].map((match) => {
      const attributes = parseAttributes(match[1]);
      return [attributes.card, attributes.src];
    }));
    for (const textMatch of pageMatch[2].matchAll(/<text\s+([^>]*)>([\s\S]*?)<\/text>/g)) {
      const linkMatch = textMatch[2].match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const attributes = parseAttributes(textMatch[1]);
      const top = Number(attributes.top || 0);
      const left = Number(attributes.left || 0);
      if (top < 250) continue;
      const cardKey = cardKeyForPosition(top, left);
      const card = cards.get(cardKey) || { nodes: [], links: [] };
      const href = linkMatch ? decodeXml(linkMatch[1]) : '';
      if (/^https?:\/\//i.test(href)) card.links.push(href);
      card.nodes.push({
        raw: decodeXml(linkMatch ? linkMatch[2] : textMatch[2]),
        top,
        left,
        size: globalFontSizes.get(attributes.font) || 0,
        bold: /<b>/i.test(textMatch[2])
      });
      cards.set(cardKey, card);
    }
    for (const [cardKey, card] of cards) {
      const lines = linesForLink(card.nodes).filter((line) => !isUtilityLine(line.text));
      const dateLine = lines.find((line) => parseDateRange(line.text, year));
      const dates = dateLine ? parseDateRange(dateLine.text, year) : null;
      if (!dates) continue;
      const titleLines = lines
        .filter((line) => line.bold && line !== dateLine && !isUtilityLine(line.text) && !parseDateRange(line.text, year))
        .filter((line) => line.text.length >= 3 && line.text.length <= 150);
      const maxTitleSize = Math.max(0, ...titleLines.map((line) => line.size));
      const title = cleanVisitSaudiText([...new Set(titleLines.filter((line) => line.size >= maxTitleSize - 2).map((line) => line.text))].join(' '));
      if (!title || /للرجوع|احجز|مكافآت/.test(title)) continue;
      const summary = cleanVisitSaudiText(lines
        .filter((line) => line !== dateLine && !titleLines.includes(line) && !isUtilityLine(line.text))
        .map((line) => line.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim());
      const href = card.links.find((value) => /webook|platinumlist|ticket|book/i.test(value))
        || card.links.find((value) => /^https?:\/\//i.test(value))
        || '';
      const bookingUrl = /webook|platinumlist|ticket|book/i.test(href) ? href : '';
      items.push({
        title,
        url: source.url,
        organizer: source.owner,
        summary: summary || `فعالية مدرجة في تقويم صيف السعودية ${year}.`,
        rich_summary: summary || undefined,
        city: destination.city,
        venue: destination.venue,
        category: inferCategory(title, summary),
        ticket_url: bookingUrl || undefined,
        registration_url: bookingUrl || undefined,
        attendance_mode: 'in-person',
        language: 'ar',
        confidence: 'official',
        review_status: 'ready-for-review',
        publication_gate: 'duplicate-review',
        verification_method: href ? 'official-pdf-linked-row' : 'official-pdf-row',
        date_precision: 'explicit-range',
        time_precision: 'date-only-defaulted',
        highlights: [`مدرج في تقويم صيف السعودية ${year}`, `الوجهة: ${destination.venue}`],
        ...(cardImages.get(cardKey) ? {
          image_url: cardImages.get(cardKey),
          image_alt: title,
          image_source_url: source.url,
          image_discovery_method: 'official-pdf-embedded-image'
        } : {}),
        ...dates
      });
    }
  }
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.title}|${item.starts_at}|${item.city}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function visitSaudiPdfBufferToXml(buffer, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventlive-visit-saudi-pdf-'));
  const pdfPath = path.join(dir, 'calendar.pdf');
  const xmlPath = path.join(dir, 'calendar.xml');
  try {
    fs.writeFileSync(pdfPath, buffer);
    const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    const year = Number(info.match(/CreationDate:.*\b(20\d{2})\b/)?.[1] || 0);
    if (!year) throw new Error('visit-saudi-pdf-missing-creation-year');
    execFileSync('pdftohtml', ['-xml', '-hidden', '-q', pdfPath, xmlPath], { maxBuffer: 16 * 1024 * 1024 });
    const xml = attachDatedCardImages(fs.readFileSync(xmlPath, 'utf8'), year, options);
    return `<eventlive-pdf-meta year="${year}"/>\n${xml}`;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
