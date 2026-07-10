const MONTHS = Object.freeze({
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
});

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

function slug(value = '') {
  return cleanText(value).toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 72) || 'session';
}

function isoTime({ year, month, day, time, period }) {
  const [rawHour, minute] = time.split(':').map(Number);
  let hour = rawHour % 12;
  if (period.toUpperCase() === 'PM') hour += 12;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`;
}

function scheduleFrom(segment, year) {
  const text = cleanText(segment.match(/<div[^>]+class=["'][^"']*tags-row[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]+class=["'][^"']*heading/i)?.[1] || segment);
  const match = text.match(/(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+(\d{1,2})\s+([A-Za-z]+),\s*(\d{1,2}:\d{2})\s*(AM|PM)\s*[—–-]+\s*(\d{1,2}:\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  if (!month) return null;
  const startsAt = isoTime({ year, month, day: Number(match[1]), time: match[3], period: match[4] });
  let endsAt = isoTime({ year, month, day: Number(match[1]), time: match[5], period: match[6] });
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    const nextDay = new Date(Date.parse(endsAt) + 86400000);
    endsAt = `${nextDay.toISOString().slice(0, 10)}T${endsAt.slice(11)}`;
  }
  return { startsAt, endsAt };
}

export function parseMoney2020AgendaHtml(html = '', {
  year,
  windowStart,
  windowEnd,
  idPrefix = `money2020-${year}`,
  sourceUrl = ''
} = {}) {
  if (!Number.isInteger(year)) throw new TypeError('Money20/20 agenda year is required');
  const min = Date.parse(windowStart || `${year}-01-01T00:00:00+03:00`);
  const max = Date.parse(windowEnd || `${year + 1}-01-01T00:00:00+03:00`);
  const segments = String(html || '').split(/<div[^>]+class=["'][^"']*agenda-box-wrapper[^"']*["'][^>]*>/i).slice(1);
  const sessions = [];
  const seen = new Set();

  for (const segment of segments) {
    const schedule = scheduleFrom(segment, year);
    if (!schedule) continue;
    const startMs = Date.parse(schedule.startsAt);
    const endMs = Date.parse(schedule.endsAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < min || endMs > max || endMs <= startMs) continue;
    const title = cleanText(segment.match(/<div[^>]+class=["'][^"']*heading[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || '');
    if (!title) continue;
    const room = cleanText(segment.match(/<div[^>]+class=["'][^"']*type[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || '');
    const speakers = [...segment.matchAll(/<div[^>]+class=["'][^"']*name[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
      .map((match) => cleanText(match[1])).filter(Boolean);
    const identityTitle = title.toLowerCase().replace(/\s+copy$/i, '').trim();
    const identity = `${schedule.startsAt}|${schedule.endsAt}|${identityTitle}|${room.toLowerCase()}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    sessions.push({
      id: `${idPrefix}-${schedule.startsAt.slice(0, 10)}-${schedule.startsAt.slice(11, 16).replace(':', '')}-${slug(title)}`,
      title,
      starts_at: schedule.startsAt,
      ends_at: schedule.endsAt,
      session_type: 'official-program-session',
      ...(room ? { room } : {}),
      ...(speakers.length ? { speaker: [...new Set(speakers)].join('، ') } : {}),
      ...(sourceUrl ? { source_url: sourceUrl } : {})
    });
  }
  return sessions.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || (a.room || '').localeCompare(b.room || '') || a.title.localeCompare(b.title));
}
