function clean(value = '') {
  return String(value || '').replace(/[\u200b\u200e\u200f\ufeff]/g, '').replace(/\s+/g, ' ').trim();
}

function slug(value = '') {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'session';
}

function timeAt(date, time) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!date || !match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return '';
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+03:00`;
}

function titleFragment(line = '') {
  const raw = String(line || '').replace(/^\f/, '');
  const formatAndTitle = raw.match(/^\s*(?:Panel Discussion|Fireside Chat|Keynote|Workshop)\s{2,}(.+)$/i);
  const durationAndTitle = raw.match(/^\s*\d+\s*mins?\s{2,}(.+)$/i);
  let value = clean(formatAndTitle?.[1] || durationAndTitle?.[1] || raw);
  if (/^(?:Panel Discussion|Fireside Chat|Keynote|Workshop|Hybrid|\d+\s*mins?|\|.*)$/i.test(value)) return '';
  return value;
}

export function parseGlobalProptechAgendaText(text = '', options = {}) {
  const {
    dayDates = { 1: '2025-10-26', 2: '2025-10-27' },
    sourceUrl = 'https://globalproptechsummit.com/agenda.pdf'
  } = options;
  const lines = String(text || '').split(/\r?\n/);
  const sessions = [];
  const seen = new Set();
  let day = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const dayMatch = lines[index].match(/DAY\s+([12])(?:\s+\d{1,2}\s+OCT)?/i);
    if (dayMatch) day = Number(dayMatch[1]);
    const timeMatch = lines[index].match(/^( {0,6})(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})(.*)$/);
    if (!timeMatch || !dayDates[day]) continue;

    const fragments = [];
    const previous = lines[index - 1] || '';
    if (/^ {10,}\S/.test(previous)) {
      const previousTitle = titleFragment(previous);
      if (previousTitle && !/program is subject|DAY\s+[12]/i.test(previousTitle)) fragments.push(previousTitle);
    }
    const inlineTitle = titleFragment(timeMatch[4].replace(/\|\s*Hybrid\s*\|\s*\d+\s*mins?/gi, ''));
    if (inlineTitle) fragments.push(inlineTitle);

    let started = fragments.length > 0;
    for (let next = index + 1; next < Math.min(lines.length, index + 10); next += 1) {
      const raw = lines[next];
      const value = titleFragment(raw);
      if (/DAY\s+[12]|^\s*\d{1,2}:\d{2}\s*-|program is subject|regularly check/i.test(clean(raw))) break;
      if (!value) {
        if (started && !clean(raw)) break;
        continue;
      }
      if (!started) {
        fragments.push(value);
        started = true;
        continue;
      }
      if (value === value.toUpperCase() && fragments.join(' ').length < 220) fragments.push(value);
      else break;
    }

    const title = clean(fragments.join(' '));
    const startsAt = timeAt(dayDates[day], timeMatch[2]);
    const endsAt = timeAt(dayDates[day], timeMatch[3]);
    if (!title || !startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) continue;
    const identity = `${startsAt}|${endsAt}|${title.toLowerCase()}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    sessions.push({
      id: `global-proptech-2025-day-${day}-${timeMatch[2].replace(':', '')}-${slug(title)}`,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      session_type: /break|reception|tour|opening/i.test(title) ? 'official-program-break' : 'official-program-session',
      track: 'Global PropTech Summit',
      source_url: sourceUrl
    });
  }
  return sessions.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.title.localeCompare(b.title));
}
