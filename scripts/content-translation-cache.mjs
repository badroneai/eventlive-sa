import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Persistent translation memory for EVENT CONTENT (titles, summaries).
// UI chrome is handled by locales/en-SA-static.json; this cache covers the
// source-fed content that made Arabic pages show English and vice versa.
// Keys are sha1 over direction + normalized source text, mirroring the
// image-cache pattern, so identical strings translate once and re-syncs are
// incremental (steady state is a handful of new events per run).

const root = process.cwd();
const cachePath = path.join(root, 'data', 'content_translations.json');

export function normalizeContentText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function detectContentLang(value = '') {
  const text = normalizeContentText(value);
  if (!text) return null;
  const arabicLetters = (text.match(/[ء-ي]/g) || []).length;
  const latinLetters = (text.match(/[A-Za-z]/g) || []).length;
  if (!arabicLetters && !latinLetters) return null;
  return arabicLetters >= latinLetters ? 'ar' : 'en';
}

export function contentTranslationKey(sourceLang, targetLang, text) {
  return crypto.createHash('sha1')
    .update(`${sourceLang}->${targetLang}|${normalizeContentText(text)}`)
    .digest('hex');
}

export function loadContentTranslations() {
  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    return parsed && typeof parsed.entries === 'object' && parsed.entries ? parsed : { version: 1, entries: {} };
  } catch {
    return { version: 1, entries: {} };
  }
}

export function saveContentTranslations(cache) {
  const payload = {
    version: 1,
    generated_at: new Date().toISOString(),
    entries: cache.entries || {}
  };
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

// Single registration point for every DISPLAYED prose field. A new content
// field added to the catalog later must be listed here once — the Arabic
// build, the English build, the autonomous CI translation, the disclosure
// marker, and the coverage metrics all derive from this registry.
export const CONTENT_PROSE_FIELDS = {
  scalars: ['title', 'summary', 'rich_summary'],
  outline_scalars: ['official_description', 'duration_text'],
  outline_lists: ['goals', 'features', 'requirements'],
  string_arrays: ['highlights'],
  session_scalars: ['title']
};

export function createContentTranslator() {
  const cache = loadContentTranslations();
  const pendingByKey = new Map();

  function translate(value, targetLang, { trackPending = true } = {}) {
    const text = normalizeContentText(value);
    if (!text) return { text: value, translated: false, needed: false, method: null };
    const sourceLang = detectContentLang(text);
    if (!sourceLang || sourceLang === targetLang) return { text: value, translated: false, needed: false, method: null };
    const key = contentTranslationKey(sourceLang, targetLang, text);
    const entry = cache.entries[key];
    if (entry && normalizeContentText(entry.text)) {
      return { text: entry.text, translated: true, needed: true, method: entry.method || 'unknown' };
    }
    // Owner policy (2026-07-27): translation effort targets current and
    // upcoming events only — archival rows never enter the pending backlog.
    if (trackPending && !pendingByKey.has(key)) {
      pendingByKey.set(key, { key, source_lang: sourceLang, target_lang: targetLang, source: text });
    }
    return { text: value, translated: false, needed: true, method: null };
  }

  // Localize every registered prose field of an event in place (lineage kept
  // in <field>_original), probe the reverse direction so the pending backlog
  // sees both languages, and report what happened for markers and metrics.
  function localizeEventProse(event, targetLang, options = {}) {
    const summary = { applied: 0, translationApplied: false, machineApplied: false, leaks: 0 };
    const apply = (holder, field) => {
      const value = holder?.[field];
      if (typeof value !== 'string' || !value.trim()) return;
      const result = translate(value, targetLang, options);
      if (result.translated) {
        if (holder[`${field}_original`] === undefined) holder[`${field}_original`] = value;
        holder[field] = result.text;
        summary.applied += 1;
        summary.translationApplied = true;
        if (result.method && result.method !== 'llm-agent') summary.machineApplied = true;
      } else if (result.needed) {
        summary.leaks += 1;
      }
      const original = holder[`${field}_original`] ?? holder[field];
      translate(original, targetLang === 'ar' ? 'en' : 'ar', options);
    };
    const applyList = (holder, field) => {
      const items = holder?.[field];
      if (!Array.isArray(items) || !items.length) return;
      if (holder[`${field}_original`] === undefined) holder[`${field}_original`] = [...items];
      holder[field] = items.map((item) => {
        if (typeof item !== 'string' || !item.trim()) return item;
        const result = translate(item, targetLang, options);
        translate(item, targetLang === 'ar' ? 'en' : 'ar', options);
        if (result.translated) {
          summary.applied += 1;
          summary.translationApplied = true;
          if (result.method && result.method !== 'llm-agent') summary.machineApplied = true;
          return result.text;
        }
        if (result.needed) summary.leaks += 1;
        return item;
      });
    };

    for (const field of CONTENT_PROSE_FIELDS.scalars) apply(event, field);
    if (event.program_outline && typeof event.program_outline === 'object') {
      for (const field of CONTENT_PROSE_FIELDS.outline_scalars) apply(event.program_outline, field);
      for (const field of CONTENT_PROSE_FIELDS.outline_lists) applyList(event.program_outline, field);
    }
    for (const field of CONTENT_PROSE_FIELDS.string_arrays) applyList(event, field);
    if (Array.isArray(event.sessions)) {
      for (const session of event.sessions) {
        if (!session || typeof session !== 'object') continue;
        for (const field of CONTENT_PROSE_FIELDS.session_scalars) apply(session, field);
      }
    }
    return summary;
  }

  return {
    cache,
    translate,
    localizeEventProse,
    pending: () => [...pendingByKey.values()]
  };
}
