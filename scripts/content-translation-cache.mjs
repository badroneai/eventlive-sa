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

export function createContentTranslator() {
  const cache = loadContentTranslations();
  const pendingByKey = new Map();

  function translate(value, targetLang, { trackPending = true } = {}) {
    const text = normalizeContentText(value);
    if (!text) return { text: value, translated: false, needed: false };
    const sourceLang = detectContentLang(text);
    if (!sourceLang || sourceLang === targetLang) return { text: value, translated: false, needed: false };
    const key = contentTranslationKey(sourceLang, targetLang, text);
    const entry = cache.entries[key];
    if (entry && normalizeContentText(entry.text)) {
      return { text: entry.text, translated: true, needed: true };
    }
    // Owner policy (2026-07-27): translation effort targets current and
    // upcoming events only — archival rows never enter the pending backlog.
    if (trackPending && !pendingByKey.has(key)) {
      pendingByKey.set(key, { key, source_lang: sourceLang, target_lang: targetLang, source: text });
    }
    return { text: value, translated: false, needed: true };
  }

  return {
    cache,
    translate,
    pending: () => [...pendingByKey.values()]
  };
}
