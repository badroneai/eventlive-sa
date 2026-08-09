import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { decodeHtmlEntities } from './html-entities.mjs';

// Persistent translation memory for EVENT CONTENT (titles, summaries).
// UI chrome is handled by locales/en-SA-static.json; this cache covers the
// source-fed content that made Arabic pages show English and vice versa.
// Keys are sha1 over direction + normalized source text, mirroring the
// image-cache pattern, so identical strings translate once and re-syncs are
// incremental (steady state is a handful of new events per run).

const root = process.cwd();
const cachePath = path.join(root, 'data', 'content_translations.json');

export function normalizeContentText(value = '') {
  // Source feeds and machine-translation output both hand back text that is
  // still HTML-escaped ("... بعنوان &quot; هاي سينيما &quot; ..."). Stored raw,
  // that entity survives every downstream pass and is escaped once more on
  // render, so the page ships "&amp;quot;" into the Google snippet. Decoding
  // at the single normalization choke point keeps entities out of the cache
  // keys AND out of the cached values.
  return decodeHtmlEntities(String(value || '')).replace(/\s+/g, ' ').trim();
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

// Structural trap #1 (2026-08-01, PM audit): strings like
// 'رابط المصدر: https://…' contain a long Latin-heavy URL, so
// detectContentLang() (which counts letters) mislabels the WHOLE string's
// source language from the URL's Latin noise rather than the actual Arabic
// label — the string then queues for "translation" it does not need, and
// every MT cycle either wastes effort or (observed in the cache: argos-mt
// entries like 'رابط المصدر' -> 'محرر') actively corrupts the label. A
// string is identity-translatable for a given target when, after stripping
// URLs/emails/paths/digits/punctuation, what remains is empty (nothing left
// to translate) or is already entirely in the target language (the label
// matches the page it renders on and only the URL/identifier noise was
// throwing off detection). This is a pure function of the string + target,
// independent of catalog content, so it is safe to gate on structurally
// (GATES-GOVERNANCE.md rule 2).
const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const WWW_PATTERN = /\bwww\.[^\s]+/gi;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/gi;
const PATH_TOKEN_PATTERN = /(^|\s)\/[^\s]+/g;

export function isIdentityTranslatable(value, targetLang) {
  const text = normalizeContentText(value);
  if (!text || !targetLang) return false;
  const stripped = text
    .replace(URL_PATTERN, ' ')
    .replace(WWW_PATTERN, ' ')
    .replace(EMAIL_PATTERN, ' ')
    .replace(PATH_TOKEN_PATTERN, ' ')
    .replace(/[0-9]+/g, ' ')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return true;
  return detectContentLang(stripped) === targetLang;
}

// Structural trap #2 (2026-08-01, PM audit): Latin-only brand/organizer
// marks ('SAIF 2026', 'MDLBEAST', 'DMG Events || KAOUN') have no Arabic
// rendering — the correct 'translation' IS the Latin mark, unchanged. The
// merge guard in merge-content-translations.mjs rejects any output lacking
// target script, so these re-queue every sync forever with no way to close
// them. This heuristic identifies a source string as brand-like enough that
// a translator/editor answering 'keep as-is' should be trusted: short, no
// sentence-ending punctuation (an abbreviation dot like 'L.L.C.' is fine —
// only a period-then-space, '!' or '?' disqualifies), no Arabic, and every
// word either starts uppercase (Title Case / ALLCAPS marks) or the string
// skews heavily uppercase overall. Deliberately conservative: normal
// lowercase-led English sentences ('Please register now') fail both checks
// and are correctly rejected — this must never become a way to silently drop
// real translation work.
const SENTENCE_BREAK_PATTERN = /[!?؟]|\.\s/;

export function isBrandLikeSource(value) {
  const text = normalizeContentText(value);
  if (!text || text.length > 80) return false;
  if (SENTENCE_BREAK_PATTERN.test(text)) return false;
  if (/[ء-ي]/.test(text)) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  const words = text
    .split(/\s+/)
    .map((token) => token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
    .filter((token) => /[A-Za-z0-9]/.test(token));
  if (!words.length || words.length > 8) return false;
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (!letters) return false;
  const uppercase = (letters.match(/[A-Z]/g) || []).length;
  const upperRatio = uppercase / letters.length;
  const allCapitalized = words.every((word) => !/^[a-z]/.test(word));
  return allCapitalized || upperRatio >= 0.3;
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
//
// WO-10 (2026-07-31, owner-caught): `venue` rendered raw English ("Qassim")
// on the Arabic card-meta line (cardMetaLine() in generate-site.mjs) because
// it was never listed here — identical failure class to the PR #19 outline
// leak. Field audit (see PR body) found four more fields that render
// human-readable prose on public pages without going through this registry:
// venue_address (separate field, defaults from venue but diverges once venue
// is translated in place — same leak, one hop later, e.g. the client-side
// attendance-page fallback `event.venue_address || event.venue`), organizer
// (renders inside the FAQ "تعتمد EventLive على {source}" sentence and the
// JSON-LD organizer name), image_alt (renders as the <img alt> on cards/hero
// whenever it differs from title — 11/516 current+upcoming events), and
// price_label (renders as the "التسجيل والدخول" attendance fact — "Free" /
// "Paid" today). Session room/track chips in the agenda timeline had the
// same gap. Deliberately NOT registered here: program_outline.provider
// (a data-feed/provenance brand label like "Ithra Events" or "Visit Saudi
// Seasons" — the same category as source_label, which has never been
// registered by design) and session.speaker (a personal name; MT
// transliteration of names risks corrupting them, same reasoning that keeps
// brand names and URLs out of the registration guard below).
export const CONTENT_PROSE_FIELDS = {
  scalars: ['title', 'summary', 'rich_summary', 'description', 'venue', 'venue_address', 'organizer', 'image_alt', 'price_label'],
  outline_scalars: ['official_description', 'duration_text'],
  outline_lists: ['goals', 'features', 'requirements'],
  string_arrays: ['highlights'],
  session_scalars: ['title', 'room', 'track']
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
      // Return the normalized form, not entry.text: entries written before the
      // decode was added still hold escaped text, and re-translating them just
      // to strip an entity would be pointless churn.
      return { text: normalizeContentText(entry.text), translated: true, needed: true, method: entry.method || 'unknown' };
    }
    // Identity-pass (2026-08-01): URL/identifier-dominant strings whose
    // target rendering is the source text itself resolve instantly here and
    // never touch the pending backlog. Only reached on a cache miss, so this
    // never overwrites an existing (even a stale/wrong) cache entry — purely
    // additive, matching every other prune/backfill path in this file. Gated
    // by trackPending (same as the queueing it replaces, right below) so it
    // stays exactly in scope with owner policy (2026-07-27): archival rows
    // get no translation effort of any kind, identity-pass included — this
    // fixes the class of string that WOULD have queued, not every row that
    // happens to match the shape.
    if (trackPending && isIdentityTranslatable(text, targetLang)) {
      cache.entries[key] = {
        source: text,
        source_lang: sourceLang,
        target_lang: targetLang,
        text,
        method: 'identity-pass',
        translated_at: new Date().toISOString()
      };
      saveContentTranslations(cache);
      return { text, translated: true, needed: true, method: 'identity-pass' };
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
