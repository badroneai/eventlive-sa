import { isLikelyImageAssetUrl, isRejectedImageAssetUrl } from './image-asset-utils.mjs';

const MONTHS = [
  ['january', 'jan'], ['february', 'feb'], ['march', 'mar'], ['april', 'apr'],
  ['may', 'may'], ['june', 'jun'], ['july', 'jul'], ['august', 'aug'],
  ['september', 'sep'], ['october', 'oct'], ['november', 'nov'], ['december', 'dec']
];

const TITLE_STOP_WORDS = new Set([
  'and', 'the', 'for', 'of', 'in', 'at', 'ksa', 'saudi', 'arabia', 'middle', 'east',
  'conference', 'summit', 'expo', 'exhibition', 'forum', 'awards', 'award', 'edition', '2026', '2027'
]);

export function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

export function pageText(html = '') {
  return decodeHtml(String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' '))
    .trim();
}

export function extractEyeOfficialWebsite(html = '') {
  const h1Index = String(html).search(/<h1\b/i);
  if (h1Index < 0) return '';
  const organizerIndex = String(html).search(/>\s*Organizer\s*<\/div>/i);
  const eventSection = String(html).slice(h1Index, organizerIndex > h1Index ? organizerIndex : h1Index + 30000);
  const match = eventSection.match(/>\s*Website:\s*[\s\S]{0,350}?href=["'](https?:\/\/[^"']+)/i);
  return match ? decodeHtml(match[1]).trim() : '';
}

export function extractEyeOrganizer(html = '') {
  const organizerIndex = String(html).search(/>\s*Organizer\s*<\/div>/i);
  if (organizerIndex < 0) return '';
  const organizerSection = String(html).slice(organizerIndex, organizerIndex + 4000);
  const imageTitle = organizerSection.match(/<img\b[^>]*\btitle=["']([^"']+)["'][^>]*>/i)?.[1];
  if (imageTitle) return decodeHtml(imageTitle).trim();
  return decodeHtml(organizerSection.match(/font-weight\s*:\s*bold[^>]*>\s*([^<]+)/i)?.[1] || '').trim();
}

export function extractOfficialPageImage(html = '', pageUrl = '') {
  for (const tag of String(html).match(/<meta\b[^>]*>/gi) || []) {
    const property = tag.match(/\b(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (!['og:image', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'].includes(property || '')) continue;
    const content = decodeHtml(tag.match(/\bcontent=["']([^"']+)["']/i)?.[1] || '').trim();
    if (!content) continue;
    try {
      return new URL(content, pageUrl).href;
    } catch {
      continue;
    }
  }
  return '';
}

export function selectOfficialEventImage(html = '', pageUrl = '') {
  const imageUrl = extractOfficialPageImage(html, pageUrl);
  const logoLike = /(?:^|[-_/])(?:header[-_])?logo(?:[-_.?/]|$)/i.test(imageUrl);
  return imageUrl && !logoLike && isLikelyImageAssetUrl(imageUrl) && !isRejectedImageAssetUrl(imageUrl) ? imageUrl : '';
}

function titleTokens(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !TITLE_STOP_WORDS.has(token) && !/^\d+$/.test(token));
}

function sameIndependentHost(firstUrl, secondUrl) {
  try {
    const first = new URL(firstUrl).hostname.replace(/^www\./, '');
    const second = new URL(secondUrl).hostname.replace(/^www\./, '');
    return first === second;
  } catch {
    return true;
  }
}

export function verifyOfficialEventPage(candidate, officialUrl, officialHtml) {
  if (!/^https?:\/\//i.test(officialUrl || '')) return { confirmed: false, reason: 'missing-official-url' };
  if (sameIndependentHost(candidate.source_url || candidate.evidence_url || '', officialUrl)) {
    return { confirmed: false, reason: 'official-link-is-not-independent' };
  }
  const text = pageText(officialHtml);
  const lower = text.toLowerCase();
  const compact = lower.replace(/[^a-z0-9]+/g, '');
  const officialUrlText = decodeURIComponent(officialUrl).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const tokens = titleTokens(candidate.title);
  const matchedTokens = tokens.filter((token) => lower.includes(token) || compact.includes(token) || officialUrlText.includes(token));
  const titleConfirmed = tokens.length
    ? matchedTokens.length >= Math.max(1, Math.ceil(tokens.length * 0.5))
    : false;
  const start = new Date(candidate.starts_at);
  if (Number.isNaN(start.getTime())) return { confirmed: false, reason: 'invalid-candidate-date' };
  const [monthLong, monthShort] = MONTHS[start.getMonth()];
  const yearConfirmed = lower.includes(String(start.getFullYear()));
  const monthConfirmed = lower.includes(monthLong) || new RegExp(`\\b${monthShort}\\b`, 'i').test(lower);
  return {
    confirmed: titleConfirmed && yearConfirmed && monthConfirmed,
    reason: !titleConfirmed ? 'title-not-confirmed' : !yearConfirmed ? 'year-not-confirmed' : !monthConfirmed ? 'month-not-confirmed' : 'confirmed',
    title_tokens: tokens,
    matched_title_tokens: matchedTokens,
    year_confirmed: yearConfirmed,
    month_confirmed: monthConfirmed
  };
}

export function canonicalOfficialUrl(value = '') {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = '';
    return url.href;
  } catch {
    return value;
  }
}
