const HTML_ENTITIES = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"'
};

function decodeHtml(value = '') {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => HTML_ENTITIES[name.toLowerCase()] ?? match);
}

function cleanText(value = '') {
  return decodeHtml(String(value || '').replace(/<!--.*?-->/gs, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value = '') {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'session';
}

function riyadhDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return '';
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return '';
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`;
}

function classTokens(value = '') {
  return new Set(String(value || '').split(/\s+/).filter(Boolean));
}

function innerHtmlByClass(segment = '', target = '') {
  const openings = [...String(segment || '').matchAll(/<div\s+class=["']([^"']+)["'][^>]*>/gi)];
  const opening = openings.find((match) => classTokens(match[1]).has(target));
  if (!opening) return '';
  const contentStart = (opening.index ?? 0) + opening[0].length;
  const contentEnd = segment.indexOf('</div>', contentStart);
  return contentEnd === -1 ? '' : segment.slice(contentStart, contentEnd);
}

export function parseHrseAgendaHtml(html = '', options = {}) {
  const {
    date = '',
    sourceUrl = 'https://informaconnect.com/hrse-saudi/agenda/',
    idPrefix = 'hrse-2026',
    sessionType = 'official-program-session'
  } = options;
  const source = String(html || '');
  const cards = [...source.matchAll(/<div\s+class=["']([^"']*\bagenda-sessions\b[^"']*)["'][^>]*>/gi)];
  const sessions = [];
  const seen = new Set();

  for (let index = 0; index < cards.length; index += 1) {
    if (!classTokens(cards[index][1]).has('session')) continue;
    const start = cards[index].index ?? 0;
    const end = cards[index + 1]?.index ?? source.length;
    const segment = source.slice(start, end);
    const time = cleanText(segment.match(/c-agenda-time-status-schedule[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?\d{1,2}:\d{2}[\s\S]*?-?[\s\S]*?\d{1,2}:\d{2}[\s\S]*?)<\/span>/i)?.[1] || '')
      .match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    const title = cleanText(innerHtmlByClass(segment, 'title'));
    if (!time || !title) continue;

    const startsAt = riyadhDateTime(date, time[1]);
    let endsAt = riyadhDateTime(date, time[2]);
    if (!startsAt || !endsAt) continue;
    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      const nextDay = new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
      endsAt = riyadhDateTime(nextDay, time[2]);
    }
    if (Date.parse(endsAt) <= Date.parse(startsAt)) continue;

    const stream = cleanText(innerHtmlByClass(segment, 'stream'));
    const speakers = [...segment.matchAll(/<strong\s+class=["'][^"']*\bspeaker-name\b[^"']*["'][^>]*>([\s\S]*?)<\/strong>/gi)]
      .map((match) => cleanText(match[1]))
      .filter(Boolean);
    const identity = `${startsAt}|${endsAt}|${title.toLowerCase()}|${stream.toLowerCase()}`;
    if (seen.has(identity)) continue;
    seen.add(identity);

    sessions.push({
      id: `${idPrefix}-${date}-${time[1].replace(':', '')}-${slug(title)}`,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      session_type: sessionType,
      ...(stream ? { room: stream, track: stream } : {}),
      ...(speakers.length ? { speaker: [...new Set(speakers)].join('، ') } : {}),
      source_url: sourceUrl
    });
  }

  return sessions.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || (a.room || '').localeCompare(b.room || '') || a.title.localeCompare(b.title));
}
