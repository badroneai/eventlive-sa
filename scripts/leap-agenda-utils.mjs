const LEAP_AGENDA_START = Date.parse('2026-08-31T00:00:00+03:00');
const LEAP_AGENDA_END = Date.parse('2026-09-04T00:00:00+03:00');

function decodeHtml(value = '') {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#039;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function cleanText(value = '') {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function saudiWallClock(value = '') {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/);
  if (!match) return '';
  const normalized = `${match[1]}T${match[2]}:${match[3] || '00'}+03:00`;
  return Number.isFinite(Date.parse(normalized)) ? normalized : '';
}

function sessionUrl(value = '') {
  try {
    const url = new URL(decodeHtml(value));
    return `${url.origin}${url.pathname}`;
  } catch {
    return '';
  }
}

function slug(value = '') {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'session';
}

function jsonLdEvent(segment = '') {
  const body = segment.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)?.[1] || '';
  if (!body) return null;
  try {
    const parsed = JSON.parse(body.trim());
    return parsed?.['@type'] === 'Event' ? parsed : null;
  } catch {
    return null;
  }
}

function roomFrom(segment = '') {
  const row = segment.match(/<div[^>]+class=["'][^"']*location-row[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || '';
  const item = [...row.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .find((match) => /map-pin/i.test(match[1]));
  const room = cleanText(item?.[1] || '');
  if (/^leap connect(?:\s*-)?\s*hall\s*4$/i.test(room)) return 'LEAP Connect - Hall 4';
  return room;
}

function trackFrom(segment = '') {
  const row = segment.match(/<div[^>]+class=["'][^"']*tag-row[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || '';
  return cleanText(row.match(/<li[^>]*>([\s\S]*?)<\/li>/i)?.[1] || '');
}

function speakersFrom(segment = '') {
  const row = segment.match(/<div[^>]+class=["'][^"']*agenda-team-row[^"']*["'][^>]*>([\s\S]*?)<div[^>]+class=["'][^"']*button-row/i)?.[1]
    || segment.match(/<div[^>]+class=["'][^"']*agenda-team-row[^"']*["'][^>]*>([\s\S]*?)<script/i)?.[1]
    || '';
  const names = [...row.matchAll(/<div[^>]+class=["'][^"']*label[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);
  return [...new Set(names)];
}

export function parseLeapAgendaHtml(html = '') {
  const segments = String(html || '').split(/<div[^>]+class=["'][^"']*agenda-box[^"']*["'][^>]*>/i).slice(1);
  const sessions = [];
  const seen = new Set();

  for (const segment of segments) {
    const event = jsonLdEvent(segment);
    if (!event) continue;
    const startsAt = saudiWallClock(event.startDate);
    const endsAt = saudiWallClock(event.endDate);
    const startMs = Date.parse(startsAt);
    const endMs = Date.parse(endsAt);
    if (!startsAt || !endsAt || endMs <= startMs) continue;
    if (startMs < LEAP_AGENDA_START || endMs > LEAP_AGENDA_END) continue;

    const heading = segment.match(/<h3[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i);
    const title = cleanText(heading?.[2] || event.name || '');
    if (!title) continue;
    const room = roomFrom(segment);
    const track = trackFrom(segment);
    const speakers = speakersFrom(segment);
    const sourceUrl = sessionUrl(heading?.[1] || String(event.description || '').match(/https?:\/\/[^\s<]+/)?.[0] || '');
    const identityTitle = title.toLowerCase().replace(/\s+copy$/i, '').trim();
    const identity = `${startsAt}|${endsAt}|${identityTitle}|${room.toLowerCase()}`;
    if (seen.has(identity)) continue;
    seen.add(identity);

    sessions.push({
      id: `leap-${startsAt.slice(0, 10)}-${startsAt.slice(11, 16).replace(':', '')}-${slug(title)}`,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      session_type: 'official-program-session',
      ...(room ? { room } : {}),
      ...(track ? { track } : {}),
      ...(speakers.length ? { speaker: speakers.join('، ') } : {}),
      ...(sourceUrl ? { source_url: sourceUrl } : {})
    });
  }

  return sessions.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || (a.room || '').localeCompare(b.room || '') || a.title.localeCompare(b.title));
}

export const LEAP_2026_AGENDA_WINDOW = Object.freeze({
  starts_at: '2026-08-31T00:00:00+03:00',
  ends_at: '2026-09-04T00:00:00+03:00'
});
