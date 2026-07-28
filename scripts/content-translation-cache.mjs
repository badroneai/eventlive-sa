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

// A translation whose output still carries a long run of source-script text
// (an untranslated sentence copied through by the MT engine) is worse than no
// translation: it ships a mixed-language page. Detect and purge such entries
// so they return to the visible pending backlog and get re-translated by the
// sentence-level pipeline.
export function isMixedTranslationText(text = '', targetLang = 'ar') {
  const value = String(text || '');
  if (targetLang === 'ar') return /[A-Za-z][A-Za-z0-9 ,;:'’&/()\-]{39,}/.test(value);
  return /[ء-ي][ء-ي0-9 ،؛:'’&/()\-]{39,}/.test(value);
}

// Machine entries that predate (or slipped past) the entity glossary carry
// hallucinated Saudi entity names ('رقابة الهيئة' -> 'control of UN-Women').
// Purge any machine ar->en entry whose source names a glossary entity but
// whose output lacks that entity's canonical English core — the row returns
// to pending and re-translates with the glossary injected. Editorial
// (llm-agent) entries are never touched.
function glossaryCore(english = '') {
  return String(english)
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/^the\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function pruneGlossaryViolations() {
  let glossary;
  try {
    glossary = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mt_glossary.json'), 'utf8'));
  } catch {
    return 0;
  }
  const terms = Object.entries(glossary)
    .map(([arabic, english]) => [
      // Standalone occurrences only — 'جدة' must not match inside 'المستجدة'.
      new RegExp(`(?<![ء-ي])${arabic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![ء-ي])`, 'u'),
      glossaryCore(english)
    ])
    .filter(([, core]) => core.length >= 4);
  const cache = loadContentTranslations();
  const removed = [];
  for (const [key, entry] of Object.entries(cache.entries || {})) {
    if (!entry || entry.method === 'llm-agent') continue;
    if (entry.source_lang !== 'ar' || entry.target_lang !== 'en') continue;
    const text = String(entry.text || '').toLowerCase();
    for (const [pattern, core] of terms) {
      if (pattern.test(String(entry.source || '')) && !text.includes(core)) {
        removed.push(key);
        delete cache.entries[key];
        break;
      }
    }
  }
  if (removed.length) saveContentTranslations(cache);
  return removed.length;
}

export function pruneMixedTranslations() {
  const cache = loadContentTranslations();
  const removed = [];
  for (const [key, entry] of Object.entries(cache.entries || {})) {
    if (!entry || entry.method === 'llm-agent') continue;
    if (isMixedTranslationText(entry.text, entry.target_lang)) {
      removed.push(key);
      delete cache.entries[key];
    }
  }
  if (removed.length) saveContentTranslations(cache);
  return removed.length;
}

export function createContentTranslator() {
  const cache = loadContentTranslations();
  const pendingByKey = new Map();

  function translate(value, targetLang, { trackPending = true } = {}) {
    const text = normalizeContentText(value);
    if (!text) return { text: value, translated: false, needed: false, method: null };
    // URLs, markup/subtitle junk, and numeric-dominant strings are not
    // translatable content — never register them as pending work.
    if (/^https?:\/\//i.test(text) || text.includes('{\\') || (text.match(/[A-Za-zء-ي]/g) || []).length < 4) {
      return { text: value, translated: false, needed: false, method: null };
    }
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
