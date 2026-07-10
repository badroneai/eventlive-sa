import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const arabicDigits = new Map([['٠', '0'], ['١', '1'], ['٢', '2'], ['٣', '3'], ['٤', '4'], ['٥', '5'], ['٦', '6'], ['٧', '7'], ['٨', '8'], ['٩', '9']]);
const months = new Map([
  ['يناير', 0], ['فبراير', 1], ['مارس', 2], ['ابريل', 3], ['أبريل', 3], ['مايو', 4], ['يونيو', 5],
  ['يوليو', 6], ['اغسطس', 7], ['أغسطس', 7], ['سبتمبر', 8], ['اكتوبر', 9], ['أكتوبر', 9], ['نوفمبر', 10], ['ديسمبر', 11]
]);
const weekdays = [
  { pattern: /الاحد|الأحد/, day: 0 },
  { pattern: /الاثنين|الإثنين/, day: 1 },
  { pattern: /الثلاث/, day: 2 },
  { pattern: /الاربع|الأربع/, day: 3 },
  { pattern: /الخميس/, day: 4 },
  { pattern: /الجمع/, day: 5 },
  { pattern: /السبت/, day: 6 }
];

export function normalizePosterOcrText(value = '') {
  return String(value || '')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[٠-٩]/g, (digit) => arabicDigits.get(digit) || digit)
    .replace(/0(20\d{2})/g, '$1')
    .replace(/ابريل/g, 'أبريل')
    .replace(/اغسطس/g, 'أغسطس')
    .replace(/اكتوبر/g, 'أكتوبر')
    .replace(/\s+/g, ' ')
    .trim();
}

function dayCandidates(token = '') {
  const digits = String(token).replace(/\D/g, '');
  const values = [];
  if (digits.length <= 2) values.push(Number(digits));
  if (digits.length === 3) values.push(Number(digits.slice(0, 2)), Number(digits.slice(-2)), Number(digits[0]), Number(digits[1]), Number(digits[2]));
  return [...new Set(values)].filter((value) => value >= 1 && value <= 31);
}

function weekdayFromText(text = '') {
  return weekdays.find((entry) => entry.pattern.test(text))?.day;
}

function timeFromTexts(texts = [], fallback = '18:00') {
  for (const text of texts) {
    const matches = [...text.matchAll(/(?<!\d)(\d{1,2}):(\d{2})\s*(صباح(?:اً)?|مساء(?:ً)?|[صم])/g)];
    for (const match of matches) {
      let hour = Number(match[1]);
      const minute = Number(match[2]);
      const marker = match[3];
      if (hour < 1 || hour > 12 || minute < 0 || minute > 59) continue;
      if (/مساء|م/.test(marker) && hour < 12) hour += 12;
      if (/صباح|ص/.test(marker) && hour === 12) hour = 0;
      return { value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, precision: 'exact' };
    }
  }
  return { value: fallback, precision: 'date-only-defaulted' };
}

function addHours(time, hours = 2) {
  const [rawHour, rawMinute] = String(time).split(':').map(Number);
  const total = Math.min(23 * 60 + 59, rawHour * 60 + rawMinute + hours * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function posterScheduleFromOcr(outputs = [], options = {}) {
  const texts = outputs.map(normalizePosterOcrText).filter(Boolean);
  const combined = texts.join(' ');
  const weekday = weekdayFromText(combined);
  const years = [...combined.matchAll(/(?<!\d)(20(?:2\d|3\d))(?!\d)/g)].map((match) => Number(match[1]));
  const candidates = new Map();

  for (const text of texts) {
    for (const [monthName, month] of months) {
      let index = text.indexOf(monthName);
      while (index >= 0) {
        const before = text.slice(Math.max(0, index - 28), index);
        const after = text.slice(index + monthName.length, index + monthName.length + 24);
        const tokens = [...before.matchAll(/\d{1,3}/g)].map((match) => match[0]);
        const localYears = [...after.matchAll(/20(?:2\d|3\d)/g)].map((match) => Number(match[0]));
        const candidateYears = localYears.length ? localYears : years;
        for (const token of tokens.slice(-3)) {
          for (const day of dayCandidates(token)) {
            for (const year of candidateYears) {
              const date = new Date(Date.UTC(year, month, day));
              if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) continue;
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const row = candidates.get(key) || { key, year, month, day, votes: 0, weekday_match: false };
              row.votes += 1;
              row.weekday_match = weekday === undefined ? false : date.getUTCDay() === weekday;
              candidates.set(key, row);
            }
          }
        }
        index = text.indexOf(monthName, index + monthName.length);
      }
    }
  }

  const rows = [...candidates.values()];
  const weekdayMatches = weekday === undefined ? [] : rows.filter((row) => row.weekday_match);
  const accepted = weekdayMatches.length === 1
    ? weekdayMatches[0]
    : rows.filter((row) => row.votes >= 2).sort((a, b) => b.votes - a.votes)[0];
  if (!accepted) return null;

  const clock = timeFromTexts(texts, options.default_start_time || '18:00');
  const endTime = options.default_end_time || addHours(clock.value, Number(options.duration_hours || 2));
  return {
    starts_at: `${accepted.key}T${clock.value}:00+03:00`,
    ends_at: `${accepted.key}T${endTime}:00+03:00`,
    date_precision: 'weekday-verified-poster-ocr',
    time_precision: clock.precision,
    weekday_verified: Boolean(accepted.weekday_match),
    ocr_votes: accepted.votes,
    raw_text: texts.join('\n---\n')
  };
}

function tesseractAvailable() {
  return spawnSync('tesseract', ['--version'], { encoding: 'utf8' }).status === 0;
}

export async function ocrRemotePoster(imageUrl, options = {}) {
  if (!imageUrl || !tesseractAvailable()) return null;
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(Number(options.timeout_ms || 30000)) });
  if (!response.ok) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024 || bytes.length > Number(options.max_bytes || 12_000_000)) return null;
  const extension = path.extname(new URL(imageUrl).pathname).slice(0, 8) || '.img';
  const token = crypto.createHash('sha1').update(imageUrl).digest('hex').slice(0, 12);
  const tempPath = path.join(os.tmpdir(), `eventlive-poster-${token}${extension}`);
  fs.writeFileSync(tempPath, bytes);
  try {
    const outputs = [];
    for (const psm of options.psm_modes || [3, 6, 11]) {
      const result = spawnSync('tesseract', [tempPath, 'stdout', '-l', options.languages || 'ara+eng', '--psm', String(psm)], {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
        timeout: Number(options.ocr_timeout_ms || 45000)
      });
      if (result.status === 0 && result.stdout?.trim()) outputs.push(result.stdout);
    }
    return posterScheduleFromOcr(outputs, options);
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}
