const MONTHS = new Map(Object.entries({
  jan: 0, january: 0, يناير: 0, كانون: 0,
  feb: 1, february: 1, فبراير: 1, شباط: 1,
  mar: 2, march: 2, مارس: 2, اذار: 2, آذار: 2,
  apr: 3, april: 3, أبريل: 3, ابريل: 3, نيسان: 3,
  may: 4, مايو: 4, أيار: 4, ايار: 4,
  jun: 5, june: 5, يونيو: 5, حزيران: 5,
  jul: 6, july: 6, يوليو: 6, تموز: 6,
  aug: 7, august: 7, أغسطس: 7, اغسطس: 7, آب: 7, اب: 7,
  sep: 8, sept: 8, september: 8, سبتمبر: 8, أيلول: 8, ايلول: 8,
  oct: 9, october: 9, أكتوبر: 9, اكتوبر: 9, تشرين: 9,
  nov: 10, november: 10, نوفمبر: 10,
  dec: 11, december: 11, ديسمبر: 11
}));

export function monthIndex(value = '') {
  const key = String(value || '').trim().toLowerCase();
  return MONTHS.has(key) ? MONTHS.get(key) : MONTHS.get(key.slice(0, 3));
}

export function saudiDateTime(year, month, day, time = '09:00:00') {
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${time}+03:00`;
}

export function inferFutureYear(month, day, now = new Date()) {
  const currentYear = now.getFullYear();
  const candidate = new Date(Date.UTC(currentYear, month, day));
  const today = new Date(Date.UTC(currentYear, now.getMonth(), now.getDate()));
  return candidate < today ? currentYear + 1 : currentYear;
}

export function parseFlexibleDateRange(value = '', options = {}) {
  const now = options.now || new Date();
  const text = String(value || '')
    .replace(/[–—]/g, '-')
    .replace(/من\s+/g, '')
    .replace(/\s+إلى\s+|\s+الى\s+|\s+to\s+/gi, ' - ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:\s*-\s*(\d{4})-(\d{1,2})-(\d{1,2}))?/);
  if (match) {
    const startYear = Number(match[1]);
    const startMonth = Number(match[2]) - 1;
    const startDay = Number(match[3]);
    const endYear = Number(match[4] || match[1]);
    const endMonth = Number(match[5] || match[2]) - 1;
    const endDay = Number(match[6] || match[3]);
    return {
      starts_at: saudiDateTime(startYear, startMonth, startDay, options.start_time || '09:00:00'),
      ends_at: saudiDateTime(endYear, endMonth, endDay, options.end_time || '18:00:00')
    };
  }
  match = text.match(/(\d{1,2})\s*-\s*(\d{1,2})\s+(\d{4})\s+([A-Za-z\u0600-\u06ff]+)/);
  if (match) {
    const year = Number(match[3]);
    const month = monthIndex(match[4]);
    if (Number.isInteger(month)) {
      return {
        starts_at: saudiDateTime(year, month, Number(match[1]), options.start_time || '09:00:00'),
        ends_at: saudiDateTime(year, month, Number(match[2]), options.end_time || '18:00:00')
      };
    }
  }

  match = text.match(/(\d{1,2})\s+([A-Za-z\u0600-\u06ff]+)\s+(\d{4})\s*-\s*(\d{1,2})\s+([A-Za-z\u0600-\u06ff]+)(?:\s+(\d{4}))?/);
  if (match) {
    const startMonth = monthIndex(match[2]);
    const endMonth = monthIndex(match[5]);
    if (Number.isInteger(startMonth) && Number.isInteger(endMonth)) {
      const startYear = Number(match[3]);
      const endYear = Number(match[6] || match[3]);
      return {
        starts_at: saudiDateTime(startYear, startMonth, Number(match[1]), options.start_time || '09:00:00'),
        ends_at: saudiDateTime(endYear, endMonth, Number(match[4]), options.end_time || '18:00:00')
      };
    }
  }

  match = text.match(/(?<!\d)(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z\u0600-\u06ff]+)(?:\s+(\d{4}))?/);
  if (match) {
    const month = monthIndex(match[3]);
    if (Number.isInteger(month)) {
      const year = Number(match[4]) || inferFutureYear(month, Number(match[1]), now);
      return {
        starts_at: saudiDateTime(year, month, Number(match[1]), options.start_time || '09:00:00'),
        ends_at: saudiDateTime(year, month, Number(match[2]), options.end_time || '18:00:00')
      };
    }
  }
  match = text.match(/([A-Za-z\u0600-\u06ff]+)\s+(\d{1,2})\s*-\s*(\d{1,2})(?:\s+(\d{4}))?/);
  if (match) {
    const month = monthIndex(match[1]);
    if (Number.isInteger(month)) {
      const year = Number(match[4]) || inferFutureYear(month, Number(match[2]), now);
      return {
        starts_at: saudiDateTime(year, month, Number(match[2]), options.start_time || '09:00:00'),
        ends_at: saudiDateTime(year, month, Number(match[3]), options.end_time || '18:00:00')
      };
    }
  }
  match = text.match(/(\d{1,2})\s+([A-Za-z\u0600-\u06ff]+)\s*-\s*(\d{1,2})\s+([A-Za-z\u0600-\u06ff]+)(?:\s+(\d{4}))?/);
  if (match) {
    const startMonth = monthIndex(match[2]);
    const endMonth = monthIndex(match[4]);
    if (Number.isInteger(startMonth) && Number.isInteger(endMonth)) {
      const startYear = Number(match[5]) || inferFutureYear(startMonth, Number(match[1]), now);
      const endYear = endMonth < startMonth ? startYear + 1 : startYear;
      return {
        starts_at: saudiDateTime(startYear, startMonth, Number(match[1]), options.start_time || '09:00:00'),
        ends_at: saudiDateTime(endYear, endMonth, Number(match[3]), options.end_time || '18:00:00')
      };
    }
  }
  match = text.match(/^\s*(\d{1,2})\s+([A-Za-z\u0600-\u06ff]+)(?:\s+(\d{4}))?\s*$/);
  if (match) {
    const month = monthIndex(match[2]);
    if (Number.isInteger(month)) {
      const year = Number(match[3]) || inferFutureYear(month, Number(match[1]), now);
      return {
        starts_at: saudiDateTime(year, month, Number(match[1]), options.start_time || '09:00:00'),
        ends_at: saudiDateTime(year, month, Number(match[1]), options.end_time || '18:00:00')
      };
    }
  }
  return null;
}
