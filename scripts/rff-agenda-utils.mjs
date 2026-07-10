function cleanLine(value = '') {
  return String(value || '').replace(/[\u200b\u200e\u200f\ufeff]/g, '').replace(/\s+/g, ' ').trim();
}
function slug(value = '') {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'session';
}

function riyadhDateTime(date, time) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!date || !match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return '';
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`;
}

export function parseRffAgendaRows(rows = [], options = {}) {
  const {
    dayDates = { 1: '2026-01-26', 2: '2026-01-27', 3: '2026-01-28' },
    sourceUrl = 'https://www.therff.com/agenda'
  } = options;
  const sessions = [];
  const seen = new Set();

  for (const row of rows || []) {
    const lines = String(row?.text || '').split(/\n+/).map(cleanLine).filter(Boolean);
    const timeIndex = lines.findIndex((line) => /^\d{1,2}:\d{2}\s*(?:-|–|—)\s*\d{1,2}:\d{2}$/.test(line));
    const dayIndex = lines.findIndex((line) => /^Day\s+[123]$/i.test(line));
    if (timeIndex === -1 || dayIndex === -1) continue;
    const times = lines[timeIndex].match(/^(\d{1,2}:\d{2})\s*(?:-|–|—)\s*(\d{1,2}:\d{2})$/);
    const day = Number(lines[dayIndex].match(/\d+/)?.[0]);
    const date = dayDates[day];
    const title = cleanLine(lines[dayIndex + 1] || '');
    if (!times || !date || !title || /^Day\s+[123]$/i.test(title)) continue;
    const startsAt = riyadhDateTime(date, times[1]);
    const endsAt = riyadhDateTime(date, times[2]);
    if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) continue;
    const format = dayIndex > timeIndex + 1 ? cleanLine(lines[dayIndex - 1]) : '';
    const identity = `${startsAt}|${endsAt}|${title.toLowerCase()}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    sessions.push({
      id: `rff-2026-day-${day}-${times[1].replace(':', '')}-${slug(title)}`,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      session_type: 'official-program-session',
      track: format && !/^\d/.test(format) ? format : 'Real Estate Future Forum',
      source_url: row?.url || sourceUrl
    });
  }
  return sessions.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.title.localeCompare(b.title));
}
