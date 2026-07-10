const ENTITIES = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"', ndash: '–', mdash: '—' };

function decodeHtml(value = '') {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}
function cleanText(value = '') {
  return decodeHtml(String(value || '').replace(/<!--.*?-->/gs, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function slug(value = '') {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'session';
}

function timeAt(date, value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return '';
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`;
}

function sessionType(title = '') {
  return /registration|refreshment|networking|break|lunch|visit to exhibitor/i.test(title)
    ? 'official-program-break'
    : 'official-program-session';
}

export function parseSmartDataAgendaHtml(html = '', options = {}) {
  const { dayDates = { 1: '2026-08-26', 2: '2026-08-27' }, sourceUrl = 'https://saudi.smartdataseries.com/agenda' } = options;
  const source = String(html || '');
  const dayStarts = [...source.matchAll(/<div\s+class=["'][^"']*\btab-content\b[^"']*\bday\b[^"']*["'][^>]+id=["']tab_(\d+)["'][^>]*>/gi)];
  const sessions = [];
  const seen = new Set();

  for (let dayIndex = 0; dayIndex < dayStarts.length; dayIndex += 1) {
    const dayNumber = Number(dayStarts[dayIndex][1]);
    const date = dayDates[dayNumber];
    if (!date) continue;
    const dayStart = dayStarts[dayIndex].index ?? 0;
    const dayEnd = dayStarts[dayIndex + 1]?.index ?? source.length;
    const daySegment = source.slice(dayStart, dayEnd);
    const cardStarts = [...daySegment.matchAll(/<div\s+class=["'][^"']*\bsection\b[^"']*["'][^>]+id=["']section_\d+_\d+["'][^>]*>/gi)];
    for (let cardIndex = 0; cardIndex < cardStarts.length; cardIndex += 1) {
      const start = cardStarts[cardIndex].index ?? 0;
      const end = cardStarts[cardIndex + 1]?.index ?? daySegment.length;
      const card = daySegment.slice(start, end);
      const time = cleanText(card.match(/<div\s+class=["']left["'][^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || '')
        .match(/(\d{1,2}:\d{2})\s*(?:-|–|—|to)\s*(\d{1,2}:\d{2})/i);
      const right = card.match(/<div\s+class=["']right["'][^>]*>([\s\S]*)/i)?.[1] || '';
      const title = cleanText(right.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1] || '');
      if (!time || !title) continue;
      const startsAt = timeAt(date, time[1]);
      const endsAt = timeAt(date, time[2]);
      if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) continue;
      const identity = `${startsAt}|${endsAt}|${title.toLowerCase()}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      sessions.push({
        id: `smart-data-2026-${date}-${time[1].replace(':', '')}-${slug(title)}`,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        session_type: sessionType(title),
        track: 'Smart Data & AI',
        source_url: sourceUrl
      });
    }
  }
  return sessions.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.title.localeCompare(b.title));
}
