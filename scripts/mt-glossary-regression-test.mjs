import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Entity-glossary contract. The glossary is the deterministic answer to MT
// entity hallucination ('رقابة الهيئة' -> 'control of UN-Women'): Arabic
// entity names are replaced with canonical English BEFORE the engine runs,
// and machine cache entries that violate the glossary are purged for
// re-translation each cycle. This test pins the data file and the wiring.

const root = process.cwd();

const glossary = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mt_glossary.json'), 'utf8'));
const entries = Object.entries(glossary);
assert.ok(entries.length >= 50, `glossary suspiciously small (${entries.length}) — curated entity coverage must not silently shrink`);
for (const [arabic, english] of entries) {
  assert.ok(arabic.trim().length >= 3, `glossary key too short to be safe: '${arabic}'`);
  assert.ok(/[ء-ي]/u.test(arabic), `glossary key must be Arabic: '${arabic}'`);
  assert.ok(english.trim().length >= 4, `glossary value empty/too short for '${arabic}'`);
  assert.ok(!/[ء-ي]/u.test(english), `glossary value must be English for '${arabic}': '${english}'`);
}
assert.equal(glossary['الهيئة العامة للغذاء والدواء'], 'the Saudi Food and Drug Authority (SFDA)', 'the SFDA anchor entry must stay — it is the documented hallucination case');

const translator = fs.readFileSync(path.join(root, 'scripts', 'auto_translate_pending.py'), 'utf8');
assert.match(translator, /apply_glossary\(source_text, glossary\)/, 'ar->en rows must pass through the glossary before MT');
assert.match(translator, /\(\?<!\[ء-ي\]\)/, 'glossary matching must be word-bounded — raw substring replacement corrupts words (جدة inside المستجدة)');

const cacheModule = fs.readFileSync(path.join(root, 'scripts', 'content-translation-cache.mjs'), 'utf8');
assert.match(cacheModule, /export function pruneGlossaryViolations/, 'glossary-violating machine entries must be purgeable');
assert.match(cacheModule, /entry\.method === 'llm-agent'\) continue;/, 'editorial entries must be exempt from every prune');

const orchestrator = fs.readFileSync(path.join(root, 'scripts', 'translate-catalog.mjs'), 'utf8');
assert.match(orchestrator, /pruneGlossaryViolations\(\)/, 'the autonomous cycle must self-heal glossary violations every run');

const { pruneGlossaryViolations } = await import('./content-translation-cache.mjs');
assert.equal(typeof pruneGlossaryViolations, 'function');

console.log(`MT_GLOSSARY_OK entries=${entries.length}`);
