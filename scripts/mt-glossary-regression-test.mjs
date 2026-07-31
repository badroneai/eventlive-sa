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

// WO-10 (2026-07-31, owner-caught): registering venue/organizer exposes the
// OPPOSITE direction the glossary never protected — en->ar rows like
// event.venue = 'Qassim'. These region/venue entries are the anchors for
// that fix; if they regress, the exact-match short circuit below has
// nothing to match and 'Qassim' goes back to unprotected MT guessing.
assert.equal(glossary['القصيم'], 'Qassim', 'the Qassim anchor entry must stay — it is the WO-10 venue-registry reproduction case');
assert.equal(glossary['حي جميل'], 'Hayy Jameel', 'the Hayy Jameel entry must stay — highest-frequency venue value in the catalog (68 occurrences)');

const translator = fs.readFileSync(path.join(root, 'scripts', 'auto_translate_pending.py'), 'utf8');
assert.match(translator, /apply_glossary\(source_text, glossary\)/, 'ar->en rows must pass through the glossary before MT');
assert.match(translator, /\(\?<!\[ء-ي\]\)/, 'glossary matching must be word-bounded — raw substring replacement corrupts words (جدة inside المستجدة)');

// WO-10: en->ar rows get a narrower, safer protection — an exact whole-value
// glossary bypass (not mid-sentence substitution; see load_reverse_glossary
// docstring for why the ar->en substitution trick is not safe to mirror).
assert.match(translator, /def load_reverse_glossary/, 'en->ar rows must have a reverse-glossary lookup (WO-10 venue/organizer fix)');
assert.match(translator, /def apply_reverse_glossary/, 'reverse-glossary application must be wired');
assert.match(translator, /if row\["target_lang"\] == "ar":/, 'the main translation loop must check for an exact reverse-glossary hit before falling back to MT for en->ar rows');

{
  const { execFileSync } = await import('node:child_process');
  const pythonProbe = `
import sys
sys.path.insert(0, 'scripts')
import importlib.util
spec = importlib.util.spec_from_file_location('auto_translate_pending', 'scripts/auto_translate_pending.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
entries = mod.load_glossary_entries()
reverse = mod.load_reverse_glossary(entries)
print(mod.apply_reverse_glossary('Qassim', reverse) or 'NONE')
print(mod.apply_reverse_glossary('the Authority', reverse) or 'NONE')
`;
  let output;
  try {
    output = execFileSync('python3', ['-c', pythonProbe], { cwd: root, encoding: 'utf8' }).trim().split('\n');
  } catch (error) {
    output = null;
    console.log(`MT_GLOSSARY_REVERSE_PROBE_SKIPPED python3 unavailable: ${error.message}`);
  }
  if (output) {
    assert.equal(output[0], 'القصيم', "reverse glossary must resolve 'Qassim' to 'القصيم' — the exact Buraydah venue reproduction case");
    assert.equal(output[1], 'NONE', "generic institutional glosses ('the Authority') must not exact-match — they are not proper nouns and would false-positive on unrelated short pending rows");
  }
}

const cacheModule = fs.readFileSync(path.join(root, 'scripts', 'content-translation-cache.mjs'), 'utf8');
assert.match(cacheModule, /export function pruneGlossaryViolations/, 'glossary-violating machine entries must be purgeable');
assert.match(cacheModule, /entry\.method === 'llm-agent'\) continue;/, 'editorial entries must be exempt from every prune');

const orchestrator = fs.readFileSync(path.join(root, 'scripts', 'translate-catalog.mjs'), 'utf8');
assert.match(orchestrator, /pruneGlossaryViolations\(\)/, 'the autonomous cycle must self-heal glossary violations every run');

const { pruneGlossaryViolations } = await import('./content-translation-cache.mjs');
assert.equal(typeof pruneGlossaryViolations, 'function');

console.log(`MT_GLOSSARY_OK entries=${entries.length}`);
